import mysql from 'mysql2/promise';
import { buildHistoricalHeadliners, mergeHistoricalHeadliners } from './headliners-patch-utils.mjs';

const dbHost = process.env.DB_HOST || '127.0.0.1';
const dbName = process.env.DB_NAME || 'uletay';
const dbUser = process.env.DB_USER || 'root';
const dbPass = process.env.DB_PASS || '';
const dryRun = process.argv.includes('--dry-run');

async function main() {
  const historical = buildHistoricalHeadliners();

  const pool = await mysql.createConnection({
    host: dbHost,
    database: dbName,
    user: dbUser,
    password: dbPass,
  });

  const [rows] = await pool.query('SELECT content FROM app_content WHERE id = 1 LIMIT 1');
  const row = rows[0];
  if (!row) {
    console.log('No app_content row — run npm run db:install --prefix cms');
    await pool.end();
    return;
  }

  const content = JSON.parse(row.content);
  const existing = Array.isArray(content.headliners) ? content.headliners : [];
  const { merged, added, updated, preserved } = mergeHistoricalHeadliners(existing, historical);

  console.log(
    `Headliners patch: ${historical.length} historical records, kept ${preserved} existing, added ${added}, updated years on ${updated} (${merged.length} total)`,
  );

  if (dryRun) {
    const sample = merged
      .filter((item) => item.years.some((year) => year < 2026))
      .slice(0, 8)
      .map((item) => `${item.name}: ${item.years.join(', ')}`);
    console.log('Dry run sample:', sample.join(' | '));
    await pool.end();
    return;
  }

  content.headliners = merged;
  await pool.query('UPDATE app_content SET content = ?, updated_at = NOW() WHERE id = 1', [
    JSON.stringify(content),
  ]);
  await pool.end();
  console.log('Headliners historical years saved to app_content');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
