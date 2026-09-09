import { saveContentSnapshot } from './save-content-snapshot.mjs';
import mysql from 'mysql2/promise';
import { pickLastFmImageUrl, syncHeadlinerImage } from '../src/lib/lastfm-images';
import { resolveLastFmProfileForHeadliner, sleep, verifyLastFmApiKey } from '../src/lib/lastfm';
import { syncAppHeadliners } from '../src/lib/headliners';
import type { AppData, Headliner } from '../src/types';
import { getDbConfig, loadDbEnv } from './load-db-env.mjs';
import { maskProxyUrl, resolveLastFmProxyUrl } from '../src/lib/lastfm-fetch';

const dryRun = process.argv.includes('--dry-run');
const refreshProfile = process.argv.includes('--refresh-profile');
const force = process.argv.includes('--force');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : undefined;
const idArg = process.argv.find((arg) => arg.startsWith('--id='));
const onlyId = idArg?.split('=')[1];

const REQUEST_DELAY_MS = 250;

function mergeHeadlinerChanges(base: Headliner[], changed: Headliner[]): Headliner[] {
  return base.map((item) => {
    const fresh = changed.find((entry) => entry.id === item.id);
    if (!fresh) {
      return item;
    }

    return {
      ...item,
      ...(fresh.lastfm ? { lastfm: fresh.lastfm } : {}),
      ...(fresh.imageUrl ? { imageUrl: fresh.imageUrl } : {}),
    };
  });
}

async function main() {
  loadDbEnv();

  const proxyUrl = resolveLastFmProxyUrl();
  console.log(
    `Last.fm image sync started${dryRun ? ' (dry-run)' : ''}${
      refreshProfile ? ' (refresh-profile)' : ''
    }${force ? ' (force)' : ''}${onlyId ? ` (id=${onlyId})` : ''}`,
  );
  if (proxyUrl) {
    console.log(`Proxy: ${maskProxyUrl(proxyUrl)}`);
  }

  console.log('Verifying Last.fm API key...');
  await verifyLastFmApiKey();
  console.log('Last.fm API key OK');

  const db = getDbConfig();
  console.log(`Connecting to MySQL ${db.host}/${db.database}...`);
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
  let headliners = synced.headliners;

  if (onlyId) {
    headliners = headliners.filter((item) => item.id === onlyId);
  }
  if (limit && Number.isFinite(limit)) {
    headliners = headliners.slice(0, limit);
  }

  let updated = 0;
  let failed = 0;

  for (const headliner of headliners) {
    process.stdout.write(`Last.fm image: ${headliner.name} ... `);

    try {
      if (headliner.imageUrl && !force) {
        console.log('skip (has image, use --force to replace)');
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      let profile = headliner.lastfm;
      if (refreshProfile || !pickLastFmImageUrl(profile?.images)) {
        profile = (await resolveLastFmProfileForHeadliner(headliner.name)) ?? profile ?? undefined;
        if (profile) {
          headliner.lastfm = profile;
        }
      }

      if (!profile) {
        failed += 1;
        console.log('no profile');
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      if (dryRun) {
        const sourceUrl = pickLastFmImageUrl(profile.images);
        if (sourceUrl) {
          updated += 1;
          console.log(`dry-run lastfm (${sourceUrl})`);
        } else {
          updated += 1;
          console.log('dry-run musicbrainz (fallback)');
        }
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      const synced = await syncHeadlinerImage(headliner.id, headliner.name, profile);
      if (!synced) {
        failed += 1;
        console.log('no image');
      } else {
        headliner.imageUrl = synced.imageUrl;
        updated += 1;
        console.log(`ok [${synced.source}] -> ${synced.imageUrl}`);
      }
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`error: ${message}`);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`Done: updated ${updated}, failed ${failed}`);

  if (dryRun) {
    await pool.end();
    return;
  }

  const nextContent = syncAppHeadliners({
    ...synced,
    headliners: mergeHeadlinerChanges(synced.headliners, headliners),
  });

  await saveContentSnapshot(pool, row.content, nextContent);
  await pool.end();
  console.log('Saved Last.fm images to uploads and app_content');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
