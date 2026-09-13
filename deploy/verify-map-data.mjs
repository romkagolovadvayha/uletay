import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const layers = { mapZones: 'Polygon', mapPaths: 'LineString', mapPois: 'Point' };
const finiteCoordinates = (value) =>
  Array.isArray(value) && value.length > 0 && value.every((item) =>
    Array.isArray(item) ? finiteCoordinates(item) : typeof item === 'number' && Number.isFinite(item),
  );

/** CMS edits can change feature counts; deploys verify format and migration version, not seed equality. */
export function validateDeployedMap(data, expectedVersion) {
  if (typeof expectedVersion !== 'string' || !expectedVersion.trim() || data?.mapDataVersion !== expectedVersion) {
    throw new Error('Deployed map version mismatch');
  }
  const counts = {};
  for (const [key, geometryType] of Object.entries(layers)) {
    const collection = data[key];
    if (collection?.type !== 'FeatureCollection' || !Array.isArray(collection.features)) {
      throw new Error(`Invalid ${key} FeatureCollection`);
    }
    for (const feature of collection.features) {
      if (feature?.type !== 'Feature' || feature.geometry?.type !== geometryType ||
          !finiteCoordinates(feature.geometry.coordinates)) {
        throw new Error(`Invalid ${key} geometry`);
      }
    }
    counts[key] = collection.features.length;
  }
  return counts;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [livePath, seedPath] = process.argv.slice(2);
  const live = JSON.parse(fs.readFileSync(livePath, 'utf8'));
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  console.log('Deployed map verified:', validateDeployedMap(live, seed.mapDataVersion));
}
