import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_URL = process.env.ULETAY_DATA_URL ?? 'https://uletayapp.ru/api/data';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'cms', 'seed', 'content.json');
const publicTarget = path.join(root, 'public', 'api', 'data');

const response = await fetch(API_URL, { headers: { Accept: 'application/json' } });
if (!response.ok) {
  throw new Error(`Production API returned ${response.status}`);
}

const data = await response.json();
if (!data?.festival || !Array.isArray(data.schedule) || !Array.isArray(data.headliners)) {
  throw new Error('Production API returned an unexpected payload');
}

const snapshot = `${JSON.stringify(data, null, 2)}\n`;
await mkdir(path.dirname(publicTarget), { recursive: true });
await writeFile(target, snapshot, 'utf8');
await writeFile(publicTarget, snapshot, 'utf8');
console.log(
  `Synced ${data.schedule.length} schedule items and ${data.headliners.length} headliners`,
);
