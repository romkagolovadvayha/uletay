import { saveContentSnapshot } from './save-content-snapshot.mjs';
import mysql from 'mysql2/promise';
import { foodcourtVendors } from './foodcourt-data.mjs';
import { getDbConfig } from './load-db-env.mjs';

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
  const existing = Array.isArray(content.foodcourt) ? content.foodcourt : [];

  if (forceReplace) {
    content.foodcourt = foodcourtVendors;
    await saveContentSnapshot(pool, row.content, content);
    await pool.end();
    console.log(`Replaced DB foodcourt with seed: ${foodcourtVendors.length} vendors`);
    return;
  }

  const { merged, added, preserved } = mergeFoodcourt(existing, foodcourtVendors);
  content.foodcourt = merged;

  await saveContentSnapshot(pool, row.content, content);
  await pool.end();
  console.log(
    `Merged foodcourt: kept ${preserved} existing, added ${added} new from seed (${merged.length} total)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
