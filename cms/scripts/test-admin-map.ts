import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { editZoneVertex, moveZone, transformZone, transformZoneGroup } from '../src/lib/admin-map-model';
import { buildPlaceScene } from '../../src/components/map/map-scene';
import { findInternalPathAsync } from '../../src/utils/map/pathfinding';
import { zoneTargetPoint } from '../../src/utils/map/zoneGeo';
import { routeCrossesFenceZones, extractFenceZones } from '../../src/utils/map/fenceRouting';
import type { AppData, MapZonesGeoJson, MapPoisGeoJson } from '../src/types';

async function main() {
  const data = JSON.parse(readFileSync(new URL('../seed/content.json', import.meta.url), 'utf8')) as AppData;
  const zone: MapZonesGeoJson['features'][number] = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [53, 56],
          [53.002, 56],
          [53.002, 56.002],
          [53, 56.002],
          [53, 56],
        ],
        [
          [53.0005, 56.0005],
          [53.0005, 56.001],
          [53.001, 56.001],
          [53.001, 56.0005],
          [53.0005, 56.0005],
        ],
      ],
    },
    properties: {
      id: 'compound',
      name: 'Павильон с проходом',
      zoneType: 'trade',
      fillColor: '#F2F0DF',
      fillOpacity: 0.95,
      accessPoint: { lng: 53, lat: 56.001 },
      geometryParts: [
        {
          type: 'Polygon',
          coordinates: [
            [
              [53.003, 56],
              [53.004, 56],
              [53.004, 56.001],
              [53.003, 56],
            ],
          ],
        },
      ],
      layoutRings: [
        [
          [53, 56],
          [53.002, 56.002],
        ],
      ],
    },
  };
  const original = JSON.stringify(zone);
  const moved = moveZone(zone, [0.01, 0.02]);
  assert.deepEqual(
    moved.geometry.coordinates[1][0].map((v) => Number(v.toFixed(9))),
    [53.0105, 56.0205],
    'Moving retains holes',
  );
  assert.deepEqual(
    moved.properties.geometryParts?.[0].coordinates[0][0],
    [53.013, 56.02],
    'All building parts move together',
  );
  assert.deepEqual(
    {
      lng: Number(moved.properties.accessPoint!.lng.toFixed(9)),
      lat: Number(moved.properties.accessPoint!.lat.toFixed(9)),
    },
    { lng: 53.01, lat: 56.021 },
    'Visitor entrance moves with the building',
  );
  assert.equal(JSON.stringify(zone), original, 'History snapshots remain immutable');
  const edited = editZoneVertex(zone, 0, [52.99, 56]);
  assert.deepEqual(
    edited.geometry.coordinates[0][0],
    edited.geometry.coordinates[0].at(-1),
    'Editing first vertex keeps the ring closed',
  );
  assert.deepEqual(
    edited.geometry.coordinates[1],
    zone.geometry.coordinates[1],
    'Vertex editing retains the courtyard',
  );
  assert.deepEqual(
    edited.properties.geometryParts,
    zone.properties.geometryParts,
    'Vertex editing retains split buildings',
  );
  const roundtrip = transformZone(transformZone(zone, 30), -30);
  zone.geometry.coordinates
    .flat()
    .forEach((c, i) =>
      c.forEach((v, axis) => assert.ok(Math.abs(v - roundtrip.geometry.coordinates.flat()[i][axis]) < 1e-9)),
    );

  const child = { ...zone, properties: { ...zone.properties, id: 'child', parentZoneId: 'compound' } };
  const linked: MapPoisGeoJson = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [53, 56] },
        properties: {
          id: 'poi',
          name: 'Вход',
          category: 'entrance',
          sourceZoneId: 'child',
          accessPoint: { lng: 53, lat: 56 },
        },
      },
    ],
  };
  const group = transformZoneGroup(
    { type: 'FeatureCollection', features: [zone, child] },
    linked,
    'compound',
    (f) => moveZone(f, [0.01, 0.02]),
    (c) => [c[0] + 0.01, c[1] + 0.02],
  );
  assert.deepEqual(
    group.zones.features[1].geometry,
    group.zones.features[0].geometry,
    'Child pitches follow their parent',
  );
  assert.deepEqual(
    group.pois.features[0].geometry.coordinates,
    [53.01, 56.02],
    'Linked POI follows the group',
  );
  assert.deepEqual(group.pois.features[0].properties.accessPoint, { lng: 53.01, lat: 56.02 });

  const places = buildPlaceScene({ zones: data.mapZones, pois: data.mapPois, filter: 'all' });
  const added = buildPlaceScene({
    zones: { type: 'FeatureCollection', features: [] },
    pois: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [53, 56] },
          properties: { id: 'info', name: 'Инфоцентр', category: 'info' },
        },
      ],
    },
    filter: 'all',
  });
  assert.equal(added.markers[0].label, 'ИНФОЦЕНТР', 'New information points do not inherit an exit caption');
  assert.ok(places.lettering.features.length > 70, 'Admin imports real public lettering');
  assert.ok(
    places.shapes.features.filter((f) => Number(f.properties.height) > 0).length > 55,
    'Admin imports public 3D buildings',
  );
  const entrance = data.mapPois!.features.find((f) => f.properties.category === 'entrance')!;
  const stage = data.mapZones!.features.find((f) => f.properties.name === 'Сцена РЕН ТВ')!;
  const start = entrance.properties.accessPoint ?? {
    lng: entrance.geometry.coordinates[0],
    lat: entrance.geometry.coordinates[1],
  };
  const route = await findInternalPathAsync(data.mapPaths, start, zoneTargetPoint(stage), data.mapZones);
  assert.ok(route, 'The admin preview uses the same working route as the app');
  assert.equal(routeCrossesFenceZones(route.coordinates, extractFenceZones(data.mapZones)), false);
  const blocked = await findInternalPathAsync(
    {
      type: 'FeatureCollection',
      features: data.mapPaths!.features.map((f) => ({ ...f, properties: { ...f.properties, closed: true } })),
    },
    start,
    zoneTargetPoint(stage),
    data.mapZones,
  );
  assert.equal(blocked, null, 'Closed paths cannot be used by route preview');
  console.log(
    'Admin map passed: immutable geometry, holes, split buildings, group transforms, linked entrances, shared 3D scene and visitor routing.',
  );
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
