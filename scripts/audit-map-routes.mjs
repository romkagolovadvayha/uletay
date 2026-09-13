import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const output = path.resolve('tmp/map-routing-audit-runtime.cjs');
await fs.mkdir(path.dirname(output), { recursive: true });

await build({
  stdin: {
    contents: [
      "export * from './src/utils/map/pathfinding';",
      "export * from './src/utils/map/zoneGeo';",
      "export * from './src/utils/map/fenceRouting';",
    ].join('\n'),
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  define: { __DEV__: 'false' },
  format: 'cjs',
  outfile: output,
  plugins: [{
    name: 'platform-link-adapter',
    setup(builder) {
      builder.onResolve({ filter: /^react-native$/ }, () => ({ path: 'platform', namespace: 'test' }));
      builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
        contents: "export const Platform={OS:'web'}; export const Linking={openURL(){throw Error('Unexpected navigation in route audit')}};",
      }));
    },
  }],
});

const {
  extractFencePaths,
  extractFenceZones,
  findInternalPathAsync,
  routeCrossesFencePaths,
  routeCrossesFenceZones,
  zoneTargetPoint,
} = await import(pathToFileURL(output).href);

const local = process.argv.includes('--local');
const data = local
  ? await (await fetch('http://localhost:3000/api/data')).json()
  : JSON.parse(await fs.readFile('cms/seed/content.json', 'utf8'));

const entranceFeatures = data.mapPois.features.filter(
  (feature) => feature.properties.category === 'entrance' && feature.properties.status !== 'closed',
);
const destinationFeatures = data.mapZones.features.filter((feature) => (
  feature.properties.zoneType === 'stage_area'
  || /^Пункт первой помощи|^Скорая помощь/i.test(feature.properties.name)
));
const representativeStartIds = new Set([
  'plan-2026-autocamp',
  'plan-2026-comfort',
  'plan-2026-camping-north',
  'plan-2026-camping-west',
  'plan-2026-camping-east',
  'plan-2026-camping-south',
  'plan-2026-camping-south-edge',
  'plan-2026-parking-north',
  'plan-2026-parking-west',
  'plan-2026-parking-road',
  'plan-2026-motorhomes',
  'plan-2026-motorhome-a1',
  'plan-2026-motorhome-a12',
  'plan-2026-hotel',
  'ticket-2027-autocamp-place-001',
  'ticket-2027-autocamp-place-120',
  'ticket-2027-autocamp-place-240',
  'ticket-2027-autocamp-place-296',
]);
const representativeStartFeatures = data.mapZones.features.filter(
  (feature) => representativeStartIds.has(feature.properties.id),
);

const pointFromPoi = (feature) => {
  const [lng, lat] = feature.geometry.coordinates;
  return feature.properties.accessPoint ?? { lat, lng };
};
const routePoint = (feature) => feature.geometry.type === 'Point'
  ? pointFromPoi(feature)
  : zoneTargetPoint(feature);

const starts = [
  ...entranceFeatures.map((feature) => ({
    id: feature.properties.id,
    name: feature.properties.name,
    kind: 'entrance',
    point: routePoint(feature),
  })),
  ...destinationFeatures.map((feature) => ({
    id: feature.properties.id,
    name: feature.properties.name,
    kind: feature.properties.zoneType === 'stage_area' ? 'stage' : 'medical',
    point: routePoint(feature),
  })),
  ...representativeStartFeatures.map((feature) => ({
    id: feature.properties.id,
    name: feature.properties.name,
    kind: 'area',
    point: routePoint(feature),
  })),
];
const destinations = destinationFeatures.map((feature) => ({
  id: feature.properties.id,
  name: feature.properties.name,
  kind: feature.properties.zoneType === 'stage_area' ? 'stage' : 'medical',
  point: routePoint(feature),
}));

const fencePaths = extractFencePaths(data.mapPaths);
async function auditRoute(start, destination) {
  const route = await findInternalPathAsync(
    data.mapPaths,
    start.point,
    destination.point,
    data.mapZones,
  );
  return {
    destinationId: destination.id,
    destinationName: destination.name,
    routable: Boolean(route),
    distanceMeters: route ? Math.round(route.distanceMeters) : null,
    crossesFence: route
      ? routeCrossesFencePaths(route.coordinates, fencePaths) || routeCrossesFenceZones(route.coordinates,extractFenceZones(data.mapZones))
      : false,
  };
}

const matrix = [];
for (const start of starts) {
  const cells = [];
  for (const destination of destinations) {
    cells.push(await auditRoute(start, destination));
  }
  matrix.push({ ...start, cells });
}

const pitchFeatures = data.mapZones.features.filter((feature) => (
  feature.properties.parentZoneId === 'plan-2026-autocamp'
  || feature.properties.parentZoneId === 'plan-2026-motorhomes'
));
const pitchMatrix = [];
for (const feature of pitchFeatures) {
  const start = {
    id: feature.properties.id,
    name: feature.properties.name,
    kind: 'pitch',
    point: routePoint(feature),
  };
  const cells = [];
  for (const destination of destinations) cells.push(await auditRoute(start, destination));
  pitchMatrix.push({ ...start, cells });
}

const report = {
  generatedAt: new Date().toISOString(),
  source: local ? 'local-api' : 'seed',
  destinations,
  matrix: matrix.map(({ point: _point, ...row }) => row),
  pitchMatrix: pitchMatrix.map(({ point: _point, ...row }) => row),
};
await fs.mkdir('artifacts/map-audit', { recursive: true });
await fs.writeFile(
  'artifacts/map-audit/route-matrix.json',
  `${JSON.stringify(report, null, 2)}\n`,
);

const headers = destinations.map((destination, index) => `${index + 1}. ${destination.name}`);
console.log(headers.join('\n'));
console.log('');
for (const row of matrix) {
  const cells = row.cells.map((cell) => (
    cell.crossesFence ? 'FENCE' : cell.routable ? String(cell.distanceMeters).padStart(4, ' ') : '   —'
  ));
  console.log(`${row.kind.padEnd(8)} ${row.name.padEnd(42)} ${cells.join('  ')}`);
}

const failed = matrix.flatMap((row) => row.cells
  .filter((cell) => !cell.routable || cell.crossesFence)
  .map((cell) => `${row.name} → ${cell.destinationName}`));
const failedPitches = pitchMatrix.flatMap((row) => row.cells
  .filter((cell) => !cell.routable || cell.crossesFence)
  .map((cell) => `${row.name} → ${cell.destinationName}`));
console.log('');
console.log(`Route matrix: ${matrix.length * destinations.length - failed.length}/${matrix.length * destinations.length} passed.`);
console.log(`Numbered pitch matrix: ${pitchMatrix.length * destinations.length - failedPitches.length}/${pitchMatrix.length * destinations.length} passed.`);
if (failed.length || failedPitches.length) {
  console.log(`Failed cases: ${failed.length + failedPitches.length}. See artifacts/map-audit/route-matrix.json`);
  process.exitCode = 1;
}
