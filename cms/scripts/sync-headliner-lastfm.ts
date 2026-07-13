import mysql from 'mysql2/promise';
import { syncAppHeadliners } from '../src/lib/headliners';
import { resolveLastFmProfileForHeadliner, sleep } from '../src/lib/lastfm';
import type { AppData } from '../src/types';
import { getDbConfig } from './load-db-env.mjs';

const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : undefined;
const idArg = process.argv.find((arg) => arg.startsWith('--id='));
const onlyId = idArg?.split('=')[1];

const STALE_MS = 24 * 60 * 60 * 1000;
const REQUEST_DELAY_MS = 350;

function isStale(updatedAt?: string): boolean {
  if (!updatedAt) {
    return true;
  }
  const updated = Date.parse(updatedAt);
  if (!Number.isFinite(updated)) {
    return true;
  }
  return Date.now() - updated >= STALE_MS;
}

async function main() {
  const db = getDbConfig();
  const pool = await mysql.createConnection({
    host: db.host,
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
  let skipped = 0;
  let failed = 0;

  for (const headliner of headliners) {
    if (!force && headliner.lastfm && !isStale(headliner.lastfm.updatedAt)) {
      skipped += 1;
      continue;
    }

    process.stdout.write(`Last.fm: ${headliner.name} ... `);

    try {
      const profile = await resolveLastFmProfileForHeadliner(headliner.name);
      if (!profile) {
        failed += 1;
        console.log('not found');
      } else {
        headliner.lastfm = profile;
        updated += 1;
        console.log(
          `ok (${profile.listeners?.toLocaleString('ru-RU') ?? '?'} listeners, ${profile.topTracks.length} tracks)`,
        );
      }
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`error: ${message}`);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`Done: updated ${updated}, skipped ${skipped}, failed ${failed}`);

  if (dryRun) {
    await pool.end();
    return;
  }

  const nextContent = syncAppHeadliners({
    ...synced,
    headliners: synced.headliners.map((item) => {
      const fresh = headliners.find((entry) => entry.id === item.id);
      return fresh?.lastfm ? { ...item, lastfm: fresh.lastfm } : item;
    }),
  });

  await pool.query('UPDATE app_content SET content = ?, updated_at = NOW() WHERE id = 1', [
    JSON.stringify(nextContent),
  ]);
  await pool.end();
  console.log('Saved Last.fm profiles to app_content');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
