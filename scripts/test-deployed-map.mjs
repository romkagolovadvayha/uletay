import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateDeployedMap } from '../deploy/verify-map-data.mjs';

const seed = JSON.parse(fs.readFileSync(new URL('../cms/seed/content.json', import.meta.url), 'utf8'));
const edited = structuredClone(seed);
edited.mapPaths.features.splice(0, 5);
edited.mapZones.features.push({
  ...structuredClone(seed.mapZones.features[0]),
  properties: { ...seed.mapZones.features[0].properties, id: 'admin-added-zone' },
});
edited.mapPois.features = [];
const before = structuredClone(edited);
assert.deepEqual(validateDeployedMap(edited, seed.mapDataVersion), {
  mapZones: seed.mapZones.features.length + 1,
  mapPaths: seed.mapPaths.features.length - 5,
  mapPois: 0,
});
assert.deepEqual(edited, before, 'Deployment verification must never overwrite CMS edits');
assert.throws(() => validateDeployedMap(edited, 'new-version'), /version mismatch/);
assert.throws(() => validateDeployedMap(edited, undefined), /version mismatch/);
assert.throws(() => validateDeployedMap({ ...edited, mapPaths: undefined }, seed.mapDataVersion), /FeatureCollection/);
const malformed = structuredClone(edited);
malformed.mapPaths.features[0].geometry.coordinates = [[null, 56]];
assert.throws(() => validateDeployedMap(malformed, seed.mapDataVersion), /geometry/);
malformed.mapPaths.features[0].geometry.type = 'Point';
malformed.mapPaths.features[0].geometry.coordinates = [53, 56];
assert.throws(() => validateDeployedMap(malformed, seed.mapDataVersion), /geometry/);
console.log('Deployment accepts saved map edits and rejects missing layers, bad geometry and wrong versions.');
