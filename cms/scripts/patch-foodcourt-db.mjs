import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { foodcourtVendors } from './foodcourt-data.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dbHost = process.env.DB_HOST || '127.0.0.1';
const dbName = process.env.DB_NAME || 'uletay';
const dbUser = process.env.DB_USER || 'root';
const dbPass = process.env.DB_PASS || '';

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
  content.foodcourt = foodcourtVendors;
  await pool.query('UPDATE app_content SET content = ?, updated_at = NOW() WHERE id = 1', [
    JSON.stringify(content),
  ]);
  await pool.end();
  console.log(`Updated DB foodcourt: ${foodcourtVendors.length} vendors`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
