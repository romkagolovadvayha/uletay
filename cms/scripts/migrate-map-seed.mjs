import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { getDbConfig } from './load-db-env.mjs';

const cmsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const seedPath = path.join(cmsRoot, 'seed', 'content.json');
const mapKeys = ['mapZones', 'mapPaths', 'mapPois'];

function featureCount(value) {
  return value?.type === 'FeatureCollection' && Array.isArray(value.features)
    ? value.features.length
    : 0;
}

function validateMapSeed(seed) {
  if (typeof seed?.mapDataVersion !== 'string' || !seed.mapDataVersion.trim()) {
    throw new Error('cms/seed/content.json must define mapDataVersion');
  }
  if (!seed.festivalMap || typeof seed.festivalMap !== 'object') {
    throw new Error('Map seed is missing festivalMap');
  }
  for (const key of mapKeys) {
    if (seed[key]?.type !== 'FeatureCollection' || !Array.isArray(seed[key].features)) {
      throw new Error(`Map seed has an invalid ${key} FeatureCollection`);
    }
  }
}

export function buildMapSeedMigration(current, seed) {
  validateMapSeed(seed);
  const version = seed.mapDataVersion.trim();
  const before = Object.fromEntries(mapKeys.map((key) => [key, featureCount(current?.[key])]));
  const after = Object.fromEntries(mapKeys.map((key) => [key, featureCount(seed[key])]));

  if (current?.mapDataVersion === version) {
    return { changed: false, version, before, after, data: current };
  }

  const adminOverlay = current?.festivalMap?.adminOverlay;
  const festivalMap = {
    ...seed.festivalMap,
    ...(adminOverlay ? { adminOverlay } : {}),
  };
  const data = {
    ...current,
    mapDataVersion: version,
    festivalMap,
    mapZones: seed.mapZones,
    mapPaths: seed.mapPaths,
    mapPois: seed.mapPois,
  };

  return { changed: true, version, before, after, data };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function preview(filePath) {
  const [current, seed] = await Promise.all([readJson(filePath), readJson(seedPath)]);
  const result = buildMapSeedMigration(current, seed);
  console.log(JSON.stringify({
    changed: result.changed,
    version: result.version,
    before: result.before,
    after: result.after,
  }, null, 2));
}

async function applyProductionMigration() {
  if (process.env.NODE_ENV !== 'production') {
    throw new Error('Production map migration requires NODE_ENV=production');
  }

  const seed = await readJson(seedPath);
  const db = getDbConfig();
  const connection = await mysql.createConnection(db);

  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      'SELECT content FROM app_content WHERE id = 1 FOR UPDATE',
    );
    if (!rows.length) {
      throw new Error('Production app_content is empty');
    }

    const current = JSON.parse(rows[0].content);
    const result = buildMapSeedMigration(current, seed);
    if (!result.changed) {
      await connection.rollback();
      console.log(`Map data ${result.version} is already installed`);
      return;
    }

    const backupDir = path.resolve(cmsRoot, '..', 'backups', 'map');
    await fs.mkdir(backupDir, { recursive: true, mode: 0o700 });
    const timestamp = new Date().toISOString().replaceAll(':', '-');
    const backupPath = path.join(backupDir, `app-content-before-${result.version}-${timestamp}.json`);
    await fs.writeFile(backupPath, `${JSON.stringify(current, null, 2)}\n`, { mode: 0o600 });

    await connection.query(
      'UPDATE app_content SET content = ?, updated_at = NOW() WHERE id = 1',
      [JSON.stringify(result.data)],
    );
    await connection.commit();
    console.log(JSON.stringify({
      installed: result.version,
      before: result.before,
      after: result.after,
      backup: backupPath,
    }, null, 2));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

const previewArg = process.argv.find((arg) => arg.startsWith('--preview-file='));
if (previewArg) {
  await preview(path.resolve(previewArg.slice('--preview-file='.length)));
} else if (process.argv.includes('--apply-production')) {
  await applyProductionMigration();
} else {
  throw new Error('Use --preview-file=<json> or --apply-production');
}
