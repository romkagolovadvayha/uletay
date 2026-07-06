import mysql from 'mysql2/promise';
import { foodcourtVendors } from './foodcourt-data.mjs';

const dbHost = process.env.DB_HOST || '127.0.0.1';
const dbName = process.env.DB_NAME || 'uletay';
const dbUser = process.env.DB_USER || 'root';
const dbPass = process.env.DB_PASS || '';
const forceReplace = process.argv.includes('--force');

function mergeFoodcourt(existing, seed) {
  const merged = [];
  const seen = new Set();

  for (const item of existing) {
    merged.push(item);
    seen.add(item.id);
  }

  let added = 0;
  for (const item of seed) {
    if (seen.has(item.id)) {
      continue;
    }
    merged.push(item);
    seen.add(item.id);
    added += 1;
  }

  return { merged, added, preserved: existing.length };
}

async function main() {
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
  const existing = Array.isArray(content.foodcourt) ? content.foodcourt : [];

  if (forceReplace) {
    content.foodcourt = foodcourtVendors;
    await pool.query('UPDATE app_content SET content = ?, updated_at = NOW() WHERE id = 1', [
      JSON.stringify(content),
    ]);
    await pool.end();
    console.log(`Replaced DB foodcourt with seed: ${foodcourtVendors.length} vendors`);
    return;
  }

  const { merged, added, preserved } = mergeFoodcourt(existing, foodcourtVendors);
  content.foodcourt = merged;

  await pool.query('UPDATE app_content SET content = ?, updated_at = NOW() WHERE id = 1', [
    JSON.stringify(content),
  ]);
  await pool.end();
  console.log(
    `Merged foodcourt: kept ${preserved} existing, added ${added} new from seed (${merged.length} total)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
