/** Run once for the isolated preview; keeps a raw backup before touching the catalog. */
import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getRussianGenres, normalizeManualArtistGenres } from '../../shared/music-genres';
import type { AppData } from '../src/types';

async function main() {
  if (process.env.DB_NAME !== 'uletay_web_design' || process.env.DB_PORT !== '3352') throw Error('This migration only targets the isolated preview database');
  const directory = resolve('../artifacts/artist-redesign-2026-11-20');
  const reference = JSON.parse(await readFile(resolve(directory, 'catalog-reference.json'), 'utf8'));
  const referenceData: AppData = reference.data || reference;
  const references = new Map(referenceData.headliners.map(item => [item.id, item]));
  const db = await mysql.createConnection({ host: '127.0.0.1', port: 3352, user: 'root', database: 'uletay_web_design' });
  try {
    await db.beginTransaction();
    const [rows] = await db.query<RowDataPacket[]>('SELECT content FROM app_content WHERE id=1 FOR UPDATE');
    const raw = typeof rows[0].content === 'string' ? rows[0].content : JSON.stringify(rows[0].content);
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, `manual-genres-backup-${Date.now()}.json`), raw, { flag: 'wx' });
    const data = JSON.parse(raw) as AppData;
    let migrated = 0, withGenres = 0, discardedTags = 0;
    for (const artist of data.headliners) {
      const tags = references.get(artist.id)?.lastfm?.tags || artist.lastfm?.tags;
      if (!Array.isArray(artist.genres)) {
        artist.genres = getRussianGenres(tags, Infinity);
        migrated++;
      } else artist.genres = normalizeManualArtistGenres(artist.genres);
      if (artist.genres.length) withGenres++;
      discardedTags += (artist.lastfm?.tags || []).filter(tag => !getRussianGenres([tag]).length).length;
      if (artist.lastfm) artist.lastfm.tags = [];
    }
    await db.execute('UPDATE app_content SET content=?,updated_at=NOW() WHERE id=1', [JSON.stringify(data)]);
    await db.commit();
    const report = { artists: data.headliners.length, migrated, withGenres, unset: data.headliners.length-withGenres, discardedTags };
    await writeFile(resolve(directory, 'manual-genres-migration.json'), JSON.stringify(report,null,2));
    console.log(report);
  } catch (error) { await db.rollback(); throw error; } finally { await db.end(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
