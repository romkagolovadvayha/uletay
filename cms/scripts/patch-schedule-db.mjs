import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { applyContentPatch } from './content-patch-utils.mjs';
import { getDbConfig } from './load-db-env.mjs';
import { removals, replacements, upsertKeys } from './schedule-patch-2026-07.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dryRun = process.argv.includes('--dry-run');

function loadSeedSchedule() {
  const seedPath = path.join(__dirname, '..', 'seed', 'content.json');
  const seed = JSON.parse(readFileSync(seedPath, 'utf8'));
  if (!Array.isArray(seed.schedule)) {
    throw new Error('cms/seed/content.json: missing schedule array');
  }
  return seed.schedule;
}

async function main() {
  const seedSchedule = loadSeedSchedule();
  const db = getDbConfig();

  const pool = await mysql.createConnection({
    host: db.host,
    database: db.database,
    user: db.user,
    password: db.password,
  });

  const [rows] = await pool.query('SELECT content FROM app_content WHERE id = 1 LIMIT 1');
  const row = rows[0];
  if (!row) {
    console.log('No app_content row — run npm run db:install --prefix cms');
    await pool.end();
    return;
  }

  const content = JSON.parse(row.content);
  const existing = Array.isArray(content.schedule) ? content.schedule : [];
  const result = applyContentPatch(existing, seedSchedule, { removals, replacements, upsertKeys });

  if (dryRun) {
    console.log(
      `Dry run: would remove ${result.removed}, add ${result.added}, update ${result.updated}, transfer ${result.imagesPreserved} image(s), keep ${result.preserved} unchanged (${result.merged.length} total)`,
    );
    await pool.end();
    return;
  }

  content.schedule = result.merged;
  await pool.query('UPDATE app_content SET content = ?, updated_at = NOW() WHERE id = 1', [
    JSON.stringify(content),
  ]);
  await pool.end();

  console.log(
    `Schedule patched: removed ${result.removed}, added ${result.added}, updated ${result.updated}, transferred ${result.imagesPreserved} image(s), kept ${result.preserved} unchanged (${result.merged.length} total)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
