/**
 * One-time patch: set exact 2017 headliner year tags from poster lineup.
 */
import { saveContentSnapshot } from './save-content-snapshot.mjs';
import mysql from 'mysql2/promise';
import { headliners2017 } from './headliners-2017-data.mjs';
import {
  buildHeadlinerId,
  canonicalHeadlinerName,
  loadArtistImageUrl,
  mergeHistoricalHeadliners,
  normalizeArtistKey,
} from './headliners-patch-utils.mjs';
import { getDbConfig } from './load-db-env.mjs';

const FESTIVAL_YEAR = 2017;
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

function buildYearHeadliners() {
  const keysYear = new Set(
    headliners2017.map((name) => normalizeArtistKey(canonicalHeadlinerName(name))),
  );

  return headliners2017.map((rawName, index) => {
    const name = canonicalHeadlinerName(rawName);
    const imageUrl = loadArtistImageUrl(name);
    return {
      id: buildHeadlinerId(name),
      name,
      description: name,
      imageTint: IMAGE_TINTS[index % IMAGE_TINTS.length],
      years: [FESTIVAL_YEAR],
      ...(imageUrl ? { imageUrl } : {}),
      _keysYear: keysYear,
    };
  });
}

function stripYearFromOthers(headliners, keysYear) {
  let stripped = 0;

  const next = headliners.map((item) => {
    const key = normalizeArtistKey(item.name);
    if (keysYear.has(key) || !item.years?.includes(FESTIVAL_YEAR)) {
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
  const targets = buildYearHeadliners();
  const keysYear = targets[0]?._keysYear ?? new Set();

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

  const { next: withoutWrongYear, stripped } = stripYearFromOthers(existing, keysYear);
  const historical = targets.map(({ _keysYear, ...item }) => item);
  const { merged, added, updated, preserved } = mergeHistoricalHeadliners(withoutWrongYear, historical);

  const withYear = merged.filter((item) => item.years?.includes(FESTIVAL_YEAR));
  const missingImages = withYear.filter((item) => !item.imageUrl).map((item) => item.name);

  console.log(
    `Headliners ${FESTIVAL_YEAR} patch: ${headliners2017.length} poster acts, stripped ${FESTIVAL_YEAR} from ${stripped} others, added ${added}, updated years on ${updated}, ${withYear.length} with year ${FESTIVAL_YEAR}`,
  );

  if (missingImages.length) {
    console.log(`Missing images (${missingImages.length}): ${missingImages.join(', ')}`);
    console.log('Run: npm run fest:fetch-2017-images (from repo root) before deploy');
  }

  if (dryRun) {
    console.log(
      'Sample:',
      withYear
        .slice(0, 10)
        .map((item) => `${item.name}${item.imageUrl ? '' : ' [no image]'}`)
        .join(' | '),
    );
    await pool.end();
    return;
  }

  content.headliners = merged;
  await saveContentSnapshot(pool, row.content, content);
  await pool.end();
  console.log(`Headliners ${FESTIVAL_YEAR} patch saved to app_content`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
