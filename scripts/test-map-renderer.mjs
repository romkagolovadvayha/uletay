import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';

await fs.mkdir('tmp', { recursive: true });
await build({ stdin: { contents: `export * from './src/components/map/map-scene'; export * from './src/components/map/map-style'; export * from './src/components/map/web-map-scene'; export * from './src/utils/map/fenceRouting';`, resolveDir: process.cwd() },
  bundle: true, platform: 'node', format: 'cjs', outfile: 'tmp/map-renderer.cjs', define: { __DEV__: 'false' },
  plugins: [{ name: 'platform', setup(b) {
    b.onResolve({ filter: /^react-native$/ }, () => ({ path: 'platform', namespace: 'test' }));
    b.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: `export const Platform={OS:'web'}; export const Linking={openURL(){throw Error('Unexpected navigation')}};` }));
  } }] });
const require = createRequire(import.meta.url);
const m = require('../tmp/map-renderer.cjs');
const data = JSON.parse(await fs.readFile('cms/seed/content.json', 'utf8'));
const props = { config: data.festivalMap, zones: data.mapZones, pois: data.mapPois, paths: data.mapPaths,
  filter: 'all', followUser: false };
const placeScene = m.buildPlaceScene(props);
assert.equal(placeScene.shapes.features.length, data.mapZones.features.filter(z=>z.properties.zoneType!=='fence').reduce((n, z) => n + 1 + (z.properties.geometryParts?.length ?? 0), 0), 'All split visitor polygons are rendered');
assert.ok(m.sceneLayers.zones.some(layer=>layer.type==='fill-extrusion'),'Native 3D building layer');
assert.ok(!m.sceneLayers.places.some(layer=>layer.type==='circle'),'No floating cluster circles on the plan');
assert.equal(placeScene.lettering.features.length,placeScene.markers.filter(p=>!p.isPitch).length,'Every non-pitch place has actual lettering geometry');
assert.ok(placeScene.shapes.features.filter(f=>f.properties.height>0).length>55,'Stages, booths and service facilities are volumetric');
for(const text of placeScene.lettering.features){
  if(!text.properties.zoneId)continue;
  const zone=data.mapZones.features.find(f=>f.properties.id===text.properties.zoneId);
  for(const p of text.geometry.coordinates.flat(2))assert.ok(booleanPointInPolygon(p,zone),'Actual glyph leaves the footprint: '+zone.properties.name);
  const building=placeScene.shapes.features.find(f=>f.properties.zoneId===zone.properties.id);
  assert.equal(text.properties.base,building.properties.height,'Lettering rests on its roof: '+zone.properties.name);
}
assert.ok(m.buildPaths(data.mapPaths,data.mapZones).features.filter(f=>f.properties.pathKind!=='fence').every(f=>f.properties.color==='#454642'&&!f.properties.dashed),'All public roads share the solid charcoal style');
for(const road of m.buildPaths(data.mapPaths,data.mapZones).features.filter(f=>f.properties.pathKind!=='fence'))
  assert.equal(m.routeCrossesFenceZones(road.geometry.coordinates,m.extractFenceZones(data.mapZones)),false,'Visible visitor road must not invite visitors into backstage: '+road.properties.name);
const ids = placeScene.markers.map(p => `${p.kind}:${p.id}`).sort();
for (const zoom of [12, 15, 17, 19, 21]) {
  const labels = m.buildPlaceLabels(placeScene.markers, zoom);
  assert.deepEqual([...labels.byKey.values()].flatMap(g => g.places.map(p => `${p.kind}:${p.id}`)).sort(), ids, 'No lost places at zoom ' + zoom);
  assert.ok(labels.data.features.every(f => Number.isFinite(f.properties.size) && f.properties.size > 0));
}
const selected = data.mapZones.features.find(z => z.properties.parentZoneId);
const selectedScene = m.buildPlaceScene({ ...props, selectedZoneId: selected.properties.id });
assert.equal(selectedScene.shapes.features.find(f => f.properties.zoneId === selected.properties.id).properties.width, 3);
const filtered = m.buildPlaceScene({ ...props, filter: 'medical' });
const gates=m.buildPlaceScene({...props,filter:'entrance'});
for(const poi of data.mapPois.features.filter(p=>p.properties.category==='entrance'&&p.properties.sourceZoneId))
  assert.ok(gates.shapes.features.some(f=>f.properties.zoneId===poi.properties.sourceZoneId&&f.properties.height>0),'Checkpoint booth remains visible in the entrance filter');
assert.equal(filtered.zones.filter(z => z.properties.zoneType !== 'fence').length, 5);
assert.ok(m.buildPaths(data.mapPaths).features.every(f => !f.properties.routingOnly));
assert.deepEqual(m.buildUserLocation({ lat: NaN, lng: 53 }).features, []);
assert.deepEqual(m.buildSavedPlaces([{ kind: 'tent', coordinate: { lat: 56, lng: 53 } }]).features[0].geometry.coordinates, [53, 56]);
assert.deepEqual(m.routeBounds([]), null);
assert.deepEqual(m.routeBounds([[53, 56], [54, 57], [NaN, 90]]), [53, 56, 54, 57]);
assert.equal(m.clampZoom(100), 21);
for (const [width, height] of [[320, 500], [844, 200], [1280, 720]]) {
  const padding = m.mapPadding(width, height, true);
  assert.ok(padding.top + padding.bottom < height && padding.left + padding.right < width, 'Route fitting leaves a usable viewport');
}
const labels = m.buildPlaceLabels(selectedScene.markers, 19);
let hit;
const handlers = { ...props, onZonePress: zone => { hit = zone.properties.id; }, onPoiPress: poi => { hit = poi.properties.id; },
  onPlacesPress: places => { hit = places.length; }, onMapCoordinatePress: coordinate => { hit = coordinate; } };
const child = selectedScene.shapes.features.find(f => f.properties.zoneId === selected.properties.id);
const parent = selectedScene.shapes.features.find(f => f.properties.zoneId === selected.properties.parentZoneId);
m.dispatchMapPress(handlers, labels, [parent, child], { lat: 56, lng: 53 });
assert.equal(hit, selected.properties.id, 'Pitch wins over its parent polygon');
m.dispatchMapPress({ ...handlers, coordinatePicking: true }, labels, [child], { lat: 56, lng: 53 });
assert.deepEqual(hit, { lat: 56, lng: 53 }, 'Saving a place works inside a zone');
const clustered = [...labels.byKey.entries()].find(([, g]) => g.places.length > 1);
if (clustered) {
  m.dispatchMapPress(handlers, labels, [{ type: 'Feature', properties: { groupKey: clustered[0] }, geometry: { type: 'Point', coordinates: [53, 56] } }], { lat: 56, lng: 53 });
  assert.equal(hit, clustered[1].places.length);
}
const sources = Object.entries({ ground:m.buildSiteGround(data.festivalMap), zones: selectedScene.shapes, rows: selectedScene.rows, lettering:selectedScene.lettering, paths: m.buildPaths(data.mapPaths,data.mapZones),
  routes: m.buildRoutes([{ kind: 'external', coordinates: [[53, 56], [54, 57]] }]), places: labels.data, saved: m.buildSavedPlaces(), user: m.buildUserLocation() })
  .map(([id, data]) => ({ id, data, layers: m.sceneLayers[id] }));
const style = m.festivalMapStyle();
for (const source of sources) { style.sources[source.id] = { type: 'geojson', data: source.data }; style.layers.push(...source.layers); }
assert.deepEqual(validateStyleMin(style).map(error => error.message), [], 'Shared style passes the actual MapLibre style validator');
const webRequire = createRequire(require.resolve('maplibre-gl/package.json'));
assert.deepEqual(webRequire('@maplibre/maplibre-gl-style-spec').validateStyleMin(style).map(error => error.message), [], 'Shared style also passes the GL JS style validator');
const stored = new Map(), layers = new Map(), updates = [];
const map = { getSource: id => stored.get(id), addSource: (id, source) => stored.set(id, { ...source, setData: data => updates.push([id, data]) }),
  getLayer: id => layers.get(id), addLayer: layer => layers.set(layer.id, layer), removeLayer: id => layers.delete(id), removeSource: id => stored.delete(id) };
const applied = { sources: new Map(), images: new Map() };
m.syncWebMapScene(map, { sources, images: [] }, applied);
m.syncWebMapScene(map, { sources, images: [] }, applied);
assert.equal(updates.length, 0, 'Unchanged scene does not recreate or resend any source');
const moved = sources.map(s => s.id === 'user' ? { ...s, data: m.buildUserLocation({ lat: 56, lng: 53 }) } : s);
m.syncWebMapScene(map, { sources: moved, images: [] }, applied);
assert.deepEqual(updates.map(([id]) => id), ['user'], 'GPS update touches only the user source');
const images = m.buildSceneImages({ adminOverlay: { imageUrl: '/plan.png', center: { lat: 56, lng: 53 }, widthMeters: 500 } }, [], url => url);
m.syncWebMapScene(map, { sources: moved, images }, applied);
assert.ok(stored.has('festival-plan'));
m.syncWebMapScene(map, { sources: moved, images: [] }, applied);
assert.ok(!stored.has('festival-plan') && !layers.has('festival-plan-raster'), 'Removing the CMS overlay removes its source and layer');
console.log(`MapLibre renderer passed: ${ids.length} places, split geometry, filters, selection, coordinate picking, styles and incremental GPS updates.`);
