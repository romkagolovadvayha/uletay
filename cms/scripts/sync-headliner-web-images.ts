import { saveContentSnapshot } from './save-content-snapshot.mjs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { sleep } from '../src/lib/duckduckgo-images';
import {
  findGroupImageDonor,
  getUniqueHeadlinerGroups,
  propagateHeadlinerImageToGroup,
  resolveHeadlinerGroupImage,
} from '../src/lib/headliner-web-images';
import { invalidateAppDataCache } from '../src/lib/app-data';
import { syncAppHeadliners } from '../src/lib/headliners';
import type { AppData, Headliner } from '../src/types';
import { getDbConfig, loadDbEnv } from './load-db-env.mjs';
import mysql from 'mysql2/promise';

const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : undefined;
const idArg = process.argv.find((arg) => arg.startsWith('--id='));
const onlyId = idArg?.split('=')[1];

const REQUEST_DELAY_MS = 1000;

type ReportEntry = {
  groupIds: string[];
  names: string[];
  status: string;
  source?: string;
  imageUrl?: string;
  query?: string;
  title?: string;
  error?: string;
};

function mergeHeadlinerChanges(base: Headliner[], updates: Map<string, string>): Headliner[] {
  return base.map((item) => {
    const imageUrl = updates.get(item.id);
    if (!imageUrl) {
      return item;
    }
    return { ...item, imageUrl };
  });
}

function groupNeedsImage(group: Headliner[], forceReplace: boolean): boolean {
  if (forceReplace) {
    return true;
  }
  return group.some((member) => !member.imageUrl?.trim());
}

async function main() {
  loadDbEnv();

  console.log(
    `Headliner web image sync${dryRun ? ' (dry-run)' : ''}${force ? ' (force)' : ''}${
      onlyId ? ` (id=${onlyId})` : ''
    }`,
  );

  const db = getDbConfig();
  const pool = await mysql.createConnection({
    host: db.host,
    port: db.port,
    database: db.database,
    user: db.user,
    password: db.password,
  });

  const [rows] = await pool.query('SELECT content FROM app_content WHERE id = 1 LIMIT 1');
  const row = (rows as { content: string }[])[0];
  if (!row) {
    throw new Error('No app_content row — run npm run db:install --prefix cms');
  }

  const content = JSON.parse(row.content) as AppData;
  const synced = syncAppHeadliners(content);
  let groups = getUniqueHeadlinerGroups(synced.headliners).filter((group) =>
    groupNeedsImage(group, force),
  );

  if (onlyId) {
    groups = groups.filter((group) => group.some((member) => member.id === onlyId));
  }
  if (limit && Number.isFinite(limit)) {
    groups = groups.slice(0, limit);
  }

  console.log(`Groups to process: ${groups.length}`);

  const updates = new Map<string, string>();
  const report: ReportEntry[] = [];
  let updated = 0;
  let failed = 0;

  for (const group of groups) {
    const names = group.map((member) => member.name);
    const label = names.join(' · ');
    process.stdout.write(`Image: ${label} ... `);

    try {
      const donor = findGroupImageDonor(group);
      if (donor?.imageUrl && !force) {
        const missing = group.filter((member) => !member.imageUrl?.trim());
        if (!missing.length) {
          console.log('skip (all have images)');
          report.push({
            groupIds: group.map((member) => member.id),
            names,
            status: 'skip',
            source: 'group',
            imageUrl: donor.imageUrl,
          });
          await sleep(REQUEST_DELAY_MS);
          continue;
        }

        if (dryRun) {
          console.log(`dry-run propagate from ${donor.name}`);
          report.push({
            groupIds: group.map((member) => member.id),
            names,
            status: 'dry-run',
            source: 'group',
            imageUrl: donor.imageUrl,
          });
          await sleep(REQUEST_DELAY_MS);
          continue;
        }

        const propagated = await propagateHeadlinerImageToGroup(donor.id, donor.imageUrl, group);
        for (const [id, imageUrl] of Object.entries(propagated)) {
          updates.set(id, imageUrl);
        }
        updated += 1;
        console.log(`ok [group] -> ${donor.imageUrl}`);
        report.push({
          groupIds: group.map((member) => member.id),
          names,
          status: 'ok',
          source: 'group',
          imageUrl: donor.imageUrl,
        });
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      const representative = group.find((member) => !onlyId || member.id === onlyId) ?? group[0];

      if (dryRun) {
        console.log(`dry-run fetch for ${representative.name}`);
        report.push({
          groupIds: group.map((member) => member.id),
          names,
          status: 'dry-run',
        });
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      const resolved = await resolveHeadlinerGroupImage(representative, synced.headliners, { force });
      if (!resolved) {
        failed += 1;
        console.log('no image');
        report.push({
          groupIds: group.map((member) => member.id),
          names,
          status: 'no-image',
        });
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      const propagated = await propagateHeadlinerImageToGroup(
        representative.id,
        resolved.imageUrl,
        group,
        { force },
      );
      for (const [id, imageUrl] of Object.entries(propagated)) {
        updates.set(id, imageUrl);
      }

      updated += 1;
      const details = resolved.query ? ` "${resolved.query}"` : '';
      console.log(`ok [${resolved.source}]${details} -> ${resolved.imageUrl}`);
      report.push({
        groupIds: group.map((member) => member.id),
        names,
        status: 'ok',
        source: resolved.source,
        imageUrl: resolved.imageUrl,
        query: resolved.query,
        title: resolved.title,
      });
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`error: ${message}`);
      report.push({
        groupIds: group.map((member) => member.id),
        names,
        status: 'error',
        error: message,
      });
    }

    await sleep(REQUEST_DELAY_MS);
  }

  const reportPath = path.join(process.cwd(), 'data', 'headliner-web-images-report.json');
  await writeFile(
    reportPath,
    JSON.stringify({ dryRun, force, groups: groups.length, updated, failed, report }, null, 2) + '\n',
    'utf8',
  );

  console.log(`Done: updated ${updated}, failed ${failed}`);
  console.log(`Report: ${reportPath}`);

  if (dryRun || updates.size === 0) {
    await pool.end();
    return;
  }

  const nextContent = syncAppHeadliners({
    ...synced,
    headliners: mergeHeadlinerChanges(synced.headliners, updates),
  });

  await saveContentSnapshot(pool, row.content, nextContent);
  invalidateAppDataCache();
  await pool.end();
  console.log('Saved headliner images to uploads and app_content');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
