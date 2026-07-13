import mysql from 'mysql2/promise';
import { syncHeadlinerImageFromLastFm } from '../src/lib/lastfm-images';
import { resolveLastFmProfileForHeadliner, sleep, verifyLastFmApiKey } from '../src/lib/lastfm';
import { syncAppHeadliners } from '../src/lib/headliners';
import type { AppData, Headliner } from '../src/types';
import { getDbConfig } from './load-db-env.mjs';

const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : undefined;
const idArg = process.argv.find((arg) => arg.startsWith('--id='));
const onlyId = idArg?.split('=')[1];

const STALE_MS = 24 * 60 * 60 * 1000;
const REQUEST_DELAY_MS = 350;

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
  await verifyLastFmApiKey();
  console.log('Last.fm API key OK');

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
  let imagesUpdated = 0;
  let skipped = 0;
  let failed = 0;

  for (const headliner of headliners) {
    const profileIsFresh = Boolean(
      !force && headliner.lastfm && !isStale(headliner.lastfm.updatedAt),
    );

    if (profileIsFresh && headliner.imageUrl) {
      skipped += 1;
      continue;
    }

    if (profileIsFresh && headliner.lastfm && !headliner.imageUrl) {
      process.stdout.write(`Last.fm image: ${headliner.name} ... `);
      try {
        if (dryRun) {
          console.log('dry-run');
        } else {
          const imageUrl = await syncHeadlinerImageFromLastFm(headliner.id, headliner.lastfm);
          if (imageUrl) {
            headliner.imageUrl = imageUrl;
            imagesUpdated += 1;
            console.log(`ok -> ${imageUrl}`);
          } else {
            failed += 1;
            console.log('no image');
          }
        }
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        console.log(`error: ${message}`);
      }

      await sleep(REQUEST_DELAY_MS);
      continue;
    }

    if (profileIsFresh) {
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

        let imageSaved = false;
        if (!headliner.imageUrl && !dryRun) {
          try {
            const imageUrl = await syncHeadlinerImageFromLastFm(headliner.id, profile);
            if (imageUrl) {
              headliner.imageUrl = imageUrl;
              imageSaved = true;
              imagesUpdated += 1;
            }
          } catch (imageError) {
            const message = imageError instanceof Error ? imageError.message : String(imageError);
            console.log(
              `ok (${profile.listeners?.toLocaleString('ru-RU') ?? '?'} listeners, ${profile.topTracks.length} tracks, image error: ${message})`,
            );
            await sleep(REQUEST_DELAY_MS);
            continue;
          }
        }

        const imageLabel = imageSaved ? ', image saved' : '';
        console.log(
          `ok (${profile.listeners?.toLocaleString('ru-RU') ?? '?'} listeners, ${profile.topTracks.length} tracks${imageLabel})`,
        );
      }
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`error: ${message}`);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`Done: updated ${updated}, images ${imagesUpdated}, skipped ${skipped}, failed ${failed}`);

  if (dryRun) {
    await pool.end();
    return;
  }

  const nextContent = syncAppHeadliners({
    ...synced,
    headliners: mergeHeadlinerChanges(synced.headliners, headliners),
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
