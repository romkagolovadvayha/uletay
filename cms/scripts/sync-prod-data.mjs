import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { getDbConfig } from './load-db-env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROD_URL = process.env.PROD_DATA_URL || 'https://uletayapp.ru/api/data';
const localFileArg = process.argv.find((arg) => arg.startsWith('--file='));
const LOCAL_FILE = localFileArg
  ? path.resolve(localFileArg.slice('--file='.length))
  : process.env.PROD_DATA_FILE || '';

const REQUIRED_KEYS = ['festival', 'stages', 'schedule', 'autographs', 'foodcourt', 'headliners'];

async function loadProdData() {
  if (LOCAL_FILE) {
    console.log(`Reading ${LOCAL_FILE} ...`);
    return JSON.parse(readFileSync(LOCAL_FILE, 'utf8'));
  }

  console.log(`Fetching ${PROD_URL} ...`);
  const res = await fetch(PROD_URL);
  if (!res.ok) {
    throw new Error(`Prod API returned ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function main() {
  const data = await loadProdData();
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid JSON from prod');
  }

  for (const key of REQUIRED_KEYS) {
    if (!(key in data)) {
      throw new Error(`Prod payload missing key: ${key}`);
    }
  }

  const summary = {
    schedule: Array.isArray(data.schedule) ? data.schedule.length : 0,
    autographs: Array.isArray(data.autographs) ? data.autographs.length : 0,
    foodcourt: Array.isArray(data.foodcourt) ? data.foodcourt.length : 0,
    headliners: Array.isArray(data.headliners) ? data.headliners.length : 0,
    stages: Array.isArray(data.stages) ? data.stages.length : 0,
    rules: Array.isArray(data.rules) ? data.rules.length : 0,
  };
  console.log('Prod counts:', summary);

  const db = getDbConfig();
  const conn = await mysql.createConnection({
    host: db.host,
    port: db.port,
    database: db.database,
    user: db.user,
    password: db.password,
  });

  try {
    const [rows] = await conn.query('SELECT id FROM app_content WHERE id = 1 LIMIT 1');
    if (!rows[0]) {
      throw new Error('No app_content row — run npm run cms:install first');
    }

    const json = JSON.stringify(data);
    await conn.query('UPDATE app_content SET content = ?, updated_at = NOW() WHERE id = 1', [
      json,
    ]);

    const [after] = await conn.query(
      'SELECT CHAR_LENGTH(content) AS len, updated_at FROM app_content WHERE id = 1',
    );
    console.log(
      `Local DB updated: ${after[0].len} chars, updated_at=${after[0].updated_at}`,
    );
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
