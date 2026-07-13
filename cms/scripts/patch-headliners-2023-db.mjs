/**
 * One-time patch: set exact 2023 headliner year tags from poster lineup.
 * - Adds missing artists for 2023
 * - Removes 2023 from artists not on the 2023 poster
 */
import mysql from 'mysql2/promise';
import { headliners2023 } from './headliners-2023-data.mjs';
import {
  buildHeadlinerId,
  canonicalHeadlinerName,
  loadArtistImageUrl,
  mergeHistoricalHeadliners,
  normalizeArtistKey,
} from './headliners-patch-utils.mjs';
import { getDbConfig } from './load-db-env.mjs';

const FESTIVAL_YEAR = 2023;
const dryRun = process.argv.includes('--dry-run');

const IMAGE_TINTS = [
  '#4A1C1C',
  '#3D2E14',
  '#1E3A4A',
  '#2A1F3D',
  '#1A1A1A',
  '#3A1414',
  '#243024',
  '#3A3018',
  '#2E2438',
  '#1F2D3A',
];

function build2023Headliners() {
  const keys2023 = new Set(
    headliners2023.map((name) => normalizeArtistKey(canonicalHeadlinerName(name))),
  );

  return headliners2023.map((rawName, index) => {
    const name = canonicalHeadlinerName(rawName);
    const imageUrl = loadArtistImageUrl(name);
    return {
      id: buildHeadlinerId(name),
      name,
      description: name,
      imageTint: IMAGE_TINTS[index % IMAGE_TINTS.length],
      years: [FESTIVAL_YEAR],
      ...(imageUrl ? { imageUrl } : {}),
      _key: normalizeArtistKey(name),
      _keys2023: keys2023,
    };
  });
}

function stripYear2023FromOthers(headliners, keys2023) {
  let stripped = 0;

  const next = headliners.map((item) => {
    const key = normalizeArtistKey(item.name);
    if (keys2023.has(key) || !item.years?.includes(FESTIVAL_YEAR)) {
      return item;
    }

    stripped += 1;
    return {
      ...item,
      years: item.years.filter((year) => year !== FESTIVAL_YEAR),
    };
  });

  return { next, stripped };
}

async function main() {
  const targets = build2023Headliners();
  const keys2023 = targets[0]?._keys2023 ?? new Set();

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
  const existing = Array.isArray(content.headliners) ? content.headliners : [];

  const { next: withoutWrong2023, stripped } = stripYear2023FromOthers(existing, keys2023);
  const historical = targets.map(({ _key, _keys2023, ...item }) => item);
  const { merged, added, updated, preserved } = mergeHistoricalHeadliners(withoutWrong2023, historical);

  const with2023 = merged.filter((item) => item.years?.includes(FESTIVAL_YEAR));
  const missingImages = with2023.filter((item) => !item.imageUrl).map((item) => item.name);

  console.log(
    `Headliners 2023 patch: ${headliners2023.length} poster acts, stripped 2023 from ${stripped} others, added ${added}, updated years on ${updated}, ${with2023.length} with year 2023`,
  );

  if (missingImages.length) {
    console.log(`Missing images (${missingImages.length}): ${missingImages.join(', ')}`);
    console.log('Run: npm run fest:fetch-2023-images (from repo root) before deploy');
  }

  if (dryRun) {
    console.log(
      'Sample:',
      with2023
        .slice(0, 10)
        .map((item) => `${item.name}${item.imageUrl ? '' : ' [no image]'}`)
        .join(' | '),
    );
    await pool.end();
    return;
  }

  content.headliners = merged;
  await pool.query('UPDATE app_content SET content = ?, updated_at = NOW() WHERE id = 1', [
    JSON.stringify(content),
  ]);
  await pool.end();
  console.log('Headliners 2023 patch saved to app_content');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
