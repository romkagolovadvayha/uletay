import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { build } from 'esbuild';

await mkdir('tmp', { recursive: true });
await build({
  stdin: { contents: `export * from './src/components/map/map-readiness.web';
    export * from './src/components/map/map-style';
    export * from './src/components/map/map-data.web'; export * from './src/components/map/map-glyphs.web';
    export * from './src/utils/map/externalRouting.web'; export * from './src/utils/map/combinedRoute';
    export * from './src/utils/map/zoneGeo'; export * from './src/utils/map/poiData';
    export * from './src/components/map/map-recovery.web';`,
    resolveDir: process.cwd() },
  bundle: true, platform: 'node', format: 'cjs', outfile: 'tmp/web-map-test.cjs',
  define: { __DEV__: 'false' },
  plugins: [{ name: 'web', setup(builder) {
    builder.onResolve({ filter: /^react-native$/ }, () => ({ path: 'platform', namespace: 'test' }));
    builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: "export const Platform={OS:'web'}; export const Linking={openURL(){throw Error('Unexpected navigation')}};" }));
    builder.onResolve({ filter: /^\.\/externalRouting$/ }, () => ({ path: `${process.cwd()}/src/utils/map/externalRouting.web.ts` }));
  } }],
});
const require = createRequire(import.meta.url);
const m = require('../tmp/web-map-test.cjs');
const snapshot = JSON.parse(await readFile('src/data/festivalMapSnapshot.json', 'utf8'));
const empty = { festivalMap: { enabled: false }, mapZones: { type: 'FeatureCollection', features: [] } };
assert.equal(m.resolveMapData(empty, 'remote'), empty, 'Published empty/deleted objects must remain empty');
assert.equal(m.resolveMapData(empty, 'cache'), empty, 'The cached CMS revision takes precedence');
assert.ok(m.resolveMapData(empty, 'fallback').mapZones.features.length > 0, 'Cold map works without an API response');
assert.ok(m.resolveMapData(empty, 'fallback').mapPois.features.some(p => p.properties.category === 'medical'),
  'Cold map includes searchable medical points derived from the saved zones');
const movedZone = { type: 'Feature', properties: { id: 'moved-tent', name: 'Tent', zoneType: 'service',
  accessPointGenerated: true, accessPoint: { lng: 0, lat: 0.00001 } },
  geometry: { type: 'Polygon', coordinates: [[[0, 0], [0.0001, 0], [0.0001, -0.0001], [0, -0.0001], [0, 0]]] } };
const zones = { type: 'FeatureCollection', features: [movedZone, { type: 'Feature',
  properties: { id: 'fence', zoneType: 'fence' }, geometry: { type: 'Polygon',
    coordinates: [[[-0.001, 0.000005], [0.001, 0.000005], [0.001, 0.001], [-0.001, 0.001], [-0.001, 0.000005]]] } }] };
assert.deepEqual(m.zoneTargetPoint(movedZone, zones), { lng: 0, lat: 0 }, 'A stale generated approach uses the nearest open footprint boundary');
assert.equal(m.zoneTargetPoint({ ...movedZone, properties: { ...movedZone.properties, accessPointGenerated: false } }, zones),
  movedZone.properties.accessPoint, 'Never change a manually configured entrance');
assert.equal(m.zoneTargetPoint({ ...movedZone, properties: { ...movedZone.properties, accessRestricted: true } }, zones),
  movedZone.properties.accessPoint, 'Never open a restricted area');
const derivedPoi = m.withOperationalPois(zones).features[0];
assert.deepEqual(m.poiCoordinate(derivedPoi, zones), { lng: 0, lat: 0 }, 'Zone and search-result routes use the same public approach');
const offline = m.festivalMapStyle({ offline: true, glyphs: m.BUNDLED_GLYPHS_URL });
assert.deepEqual(offline.sources, {}, 'The local plan must not wait for remote base tiles');
assert.equal(offline.glyphs, '/map-fonts/noto-v1/{fontstack}/{range}.pbf');
const font = '/map-fonts/noto-v1/Noto%20Sans%20Regular/1024-1279.pbf';
assert.equal(m.bundledGlyphRequest(font).url, font);
assert.equal(m.bundledGlyphRequest('/map-fonts/noto-v1/Noto%20Sans%20Regular/256-511.pbf').url,
  'https://tiles.openfreemap.org/fonts/Noto%20Sans%20Regular/256-511.pbf');

const handlers = new Map(), loaded = new Set();
let ready = 0;
const stop = m.watchFestivalMapReady({
  on: (event, callback) => handlers.set(event, callback), off: event => handlers.delete(event),
  getSource: id => ['zones', 'paths'].includes(id), isSourceLoaded: id => loaded.has(id),
}, () => ready++);
handlers.get('render')(); assert.equal(ready, 0);
loaded.add('zones'); handlers.get('render')(); assert.equal(ready, 0);
loaded.add('paths'); handlers.get('render')(); handlers.get('render')();
assert.equal(ready, 1, 'Ready after visitor geometry renders, without waiting for remote images or labels');
stop(); assert.equal(handlers.size, 0);
const connection = new EventTarget();
let recoveries = 0, online = false;
const stopRecovery = m.watchMapRecovery(() => recoveries++, connection, () => online);
connection.dispatchEvent(new Event('online')); assert.equal(recoveries, 0);
online = true;
connection.dispatchEvent(new Event('online')); connection.dispatchEvent(new Event('online'));
assert.equal(recoveries, 1, 'Reconnect retries once without a reload loop');
stopRecovery();
const cancelledRecovery = m.watchMapRecovery(() => recoveries++, connection, () => true);
cancelledRecovery(); connection.dispatchEvent(new Event('online')); assert.equal(recoveries, 1);

const context = vm.createContext({});
vm.runInContext('Object.hasOwn = undefined; Array.prototype.at = undefined;', context);
vm.runInContext(await readFile('scripts/maplibre-compat.js', 'utf8'), context);
assert.equal(vm.runInContext('Object.hasOwn({a:1},"a") && [1,2,3].at(-1) === 3', context), true);
const { revision } = require('../src/components/map/maplibre-assets.json');
const { version } = require('maplibre-gl/package.json');
for (const name of ['entry.js', 'maplibre-gl-worker.cjs']) {
  const script = await readFile(`public/vendor/maplibre/${version}/${revision}/${name}`, 'utf8');
  new vm.Script(script, { filename: name }); // Parse as classic scripts, not ESM.
  assert.ok(script.includes('Object.hasOwn') && script.includes('Array.prototype.at'));
}
for (const range of ['0-255', '1024-1279', '8192-8447']) {
  assert.ok((await readFile(`public/map-fonts/noto-v1/Noto Sans Regular/${range}.pbf`)).length > 0);
}
const originalFetch = globalThis.fetch;
try {
  let calls = 0;
  globalThis.fetch = async url => {
    calls++;
    assert.ok(String(url).startsWith('https://router.project-osrm.org/'));
    return new Response(JSON.stringify({ code: 'Ok', routes: [{ distance: 1200, duration: 150,
      geometry: { coordinates: [[53, 56], [53.01, 56.01]] } }] }));
  };
  const origin = { lat: 56, lng: 53 }, target = { lat: 56.01, lng: 53.01 };
  const routes = await Promise.all([m.fetchDrivingRoute(origin, target), m.fetchDrivingRoute(origin, target)]);
  assert.deepEqual(routes[0], routes[1]); assert.equal(calls, 1, 'Concurrent requests share a single route request');
  await m.fetchDrivingRoute(origin, target); assert.equal(calls, 1, 'Successful routes are cached');
  globalThis.fetch = async () => { calls++; return new Response('{}', { status: 503 }); };
  const other = { lat: 56.85, lng: 53.2 };
  await assert.rejects(m.fetchDrivingRoute(other, target), /автомаршрут/, 'Failure must never become a straight road line');
  const failedCalls = calls;
  await assert.rejects(m.fetchDrivingRoute(other, target));
  assert.ok(calls > failedCalls, 'Failed routes are not cached');
  const poi = snapshot.mapPois.features.find(p => p.properties.category !== 'entrance' && p.properties.status !== 'closed') ?? snapshot.mapPois.features[0];
  const combined = await m.buildCombinedRouteToTarget({ userLocation: other,
    target: poi.properties.accessPoint ?? { lng: poi.geometry.coordinates[0], lat: poi.geometry.coordinates[1] },
    targetName: poi.properties.name, mapConfig: snapshot.festivalMap, mapPaths: snapshot.mapPaths,
    mapPois: snapshot.mapPois, mapZones: snapshot.mapZones });
  assert.ok(combined?.roadRouteUnavailable && combined.arrivalPoint);
  assert.ok(combined.segments.every(s => s.kind === 'internal'), 'A failed road provider preserves the valid walking route');
} finally { globalThis.fetch = originalFetch; }
console.log('Web map: cold fallback, authoritative CMS data, local fonts, readiness and classic worker compatibility passed.');
