import { nearestPointOnLine } from '@turf/nearest-point-on-line';
import { lineString, point } from '@turf/helpers';
import type { LatLng, MapPathProperties, MapPathsGeoJson, MapZonesGeoJson } from '../../types/map';
import { fetchWalkingRoute, type RouteRequestOptions, walkingDurationSeconds } from './externalRouting';
import {
  extractFencePaths,
  extractFenceZones,
  fenceAvoidZonesParam,
  routeCrossesFencePaths,
  routeCrossesFenceZones,
  routableDrawnFeatures,
  type FenceZones,
} from './fenceRouting';
import { haversineMeters, coordToLatLng } from './geo';
import { splitPathJunctions } from './pathJunctions';

type GraphNode = {
  id: string;
  lng: number;
  lat: number;
};

type GraphEdge = {
  to: string;
  weight: number;
  featureIndex: number;
  fromIndex: number;
  toIndex: number;
};

type PathSnap = {
  lng: number;
  lat: number;
  distance: number;
  segment: [[number, number], [number, number]];
  featureIndex: number;
  segmentIndex: number;
};

type CameFromEntry = {
  prev: string | null;
  edge: GraphEdge | null;
};

/** A POI must have an explicit access point close to a drawn visitor path. */
const MAX_CONNECTOR_DISTANCE_M = 25;
const EXACT_MERGE_M = 2;
const MERGE_STEPS_M = [2, 3] as const;
const VIRTUAL_FEATURE = -1;

type RouteContext = {
  fenceZones: FenceZones;
  fencePaths: ReturnType<typeof extractFencePaths>;
  routeOptions: RouteRequestOptions;
};

function createRouteContext(mapZones?: MapZonesGeoJson, mapPaths?: MapPathsGeoJson): RouteContext {
  const fenceZones = extractFenceZones(mapZones);
  return {
    fenceZones,
    fencePaths: extractFencePaths(mapPaths),
    routeOptions: { avoidZones: fenceAvoidZonesParam(fenceZones) },
  };
}

function nodeKey(lng: number, lat: number): string {
  return `${lng.toFixed(6)},${lat.toFixed(6)}`;
}

function findExistingNodeId(
  nodes: Map<string, GraphNode>,
  lng: number,
  lat: number,
  mergeM: number,
): string | null {
  for (const node of nodes.values()) {
    if (haversineMeters(coordToLatLng([lng, lat]), { lat: node.lat, lng: node.lng }) <= mergeM) {
      return node.id;
    }
  }
  return null;
}

function getOrCreateNode(
  nodes: Map<string, GraphNode>,
  lng: number,
  lat: number,
  mergeM: number,
  isEndpoint: boolean,
): string {
  const mergeRadius = isEndpoint ? mergeM : EXACT_MERGE_M;
  const existing = findExistingNodeId(nodes, lng, lat, mergeRadius);
  if (existing) return existing;
  const id = nodeKey(lng, lat);
  nodes.set(id, { id, lng, lat });
  return id;
}

function addEdge(
  adjacency: Map<string, GraphEdge[]>,
  from: string,
  to: string,
  weight: number,
  meta: Pick<GraphEdge, 'featureIndex' | 'fromIndex' | 'toIndex'>,
) {
  if (from === to || weight <= 0) return;
  const list = adjacency.get(from) ?? [];
  list.push({ to, weight, ...meta });
  adjacency.set(from, list);
}

function routableFeatures(paths?: MapPathsGeoJson) {
  return routableDrawnFeatures(paths);
}

export function buildGraph(paths: MapPathsGeoJson | undefined, mergeM: number = MERGE_STEPS_M[0]) {
  const nodes = new Map<string, GraphNode>();
  const adjacency = new Map<string, GraphEdge[]>();
  const features = splitPathJunctions(routableFeatures(paths), mergeM);

  for (let featureIndex = 0; featureIndex < features.length; featureIndex += 1) {
    const coords = features[featureIndex].geometry.coordinates;
    const lastIndex = coords.length - 1;
    for (let i = 0; i < lastIndex; i += 1) {
      const [lng1, lat1] = coords[i];
      const [lng2, lat2] = coords[i + 1];
      const a = getOrCreateNode(nodes, lng1, lat1, mergeM, i === 0);
      const b = getOrCreateNode(nodes, lng2, lat2, mergeM, i + 1 === lastIndex);
      const weight = haversineMeters({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 });
      addEdge(adjacency, a, b, weight, { featureIndex, fromIndex: i, toIndex: i + 1 });
      addEdge(adjacency, b, a, weight, { featureIndex, fromIndex: i + 1, toIndex: i });
    }
  }

  return { nodes, adjacency, features };
}

function nearestPointOnPaths(
  paths: MapPathsGeoJson | undefined,
  target: LatLng,
): PathSnap | null {
  let best: PathSnap | null = null;
  const targetPoint = point([target.lng, target.lat]);
  const features = routableFeatures(paths);

  features.forEach((feature, featureIndex) => {
    const coords = feature.geometry.coordinates as [number, number][];
    const nearest = nearestPointOnLine(lineString(coords), targetPoint);
    const [lng, lat] = nearest.geometry.coordinates;
    const distance = haversineMeters(target, { lat, lng });
    const segmentIndex = Math.max(
      0,
      Math.min(coords.length - 2, Number(nearest.properties.index ?? 0)),
    );
    if (!best || distance < best.distance) {
      best = {
        lng,
        lat,
        distance,
        segment: [coords[segmentIndex], coords[segmentIndex + 1]],
        featureIndex,
        segmentIndex,
      };
    }
  });

  return best;
}

function attachSnapToGraph(
  nodes: Map<string, GraphNode>,
  adjacency: Map<string, GraphEdge[]>,
  snap: PathSnap,
  mergeM: number,
): string {
  const snapId = getOrCreateNode(nodes, snap.lng, snap.lat, mergeM, true);
  const [start, end] = snap.segment;
  const startId = getOrCreateNode(nodes, start[0], start[1], mergeM, true);
  const endId = getOrCreateNode(nodes, end[0], end[1], mergeM, true);

  const toStart = haversineMeters({ lat: snap.lat, lng: snap.lng }, coordToLatLng(start));
  const toEnd = haversineMeters({ lat: snap.lat, lng: snap.lng }, coordToLatLng(end));

  addEdge(adjacency, snapId, startId, toStart, {
    featureIndex: VIRTUAL_FEATURE,
    fromIndex: snap.segmentIndex,
    toIndex: snap.segmentIndex,
  });
  addEdge(adjacency, startId, snapId, toStart, {
    featureIndex: VIRTUAL_FEATURE,
    fromIndex: snap.segmentIndex,
    toIndex: snap.segmentIndex,
  });
  addEdge(adjacency, snapId, endId, toEnd, {
    featureIndex: VIRTUAL_FEATURE,
    fromIndex: snap.segmentIndex + 1,
    toIndex: snap.segmentIndex + 1,
  });
  addEdge(adjacency, endId, snapId, toEnd, {
    featureIndex: VIRTUAL_FEATURE,
    fromIndex: snap.segmentIndex + 1,
    toIndex: snap.segmentIndex + 1,
  });

  return snapId;
}

function reconstructNodeChain(
  cameFrom: Map<string, CameFromEntry>,
  endId: string,
): string[] {
  const chain: string[] = [];
  let current: string | null = endId;
  while (current) {
    chain.unshift(current);
    current = cameFrom.get(current)?.prev ?? null;
  }
  return chain;
}

function appendPolylineSlice(
  coords: [number, number][],
  lineCoords: [number, number][],
  fromIndex: number,
  toIndex: number,
) {
  if (fromIndex === toIndex) {
    appendUnique(coords, lineCoords[fromIndex]);
    return;
  }
  const step = fromIndex < toIndex ? 1 : -1;
  for (let i = fromIndex; ; i += step) {
    appendUnique(coords, lineCoords[i]);
    if (i === toIndex) break;
  }
}

function expandNodeChain(
  nodeChain: string[],
  cameFrom: Map<string, CameFromEntry>,
  nodes: Map<string, GraphNode>,
  features: GeoJSON.Feature<GeoJSON.LineString, MapPathProperties>[],
): [number, number][] {
  if (nodeChain.length === 0) return [];
  if (nodeChain.length === 1) {
    const node = nodes.get(nodeChain[0])!;
    return [[node.lng, node.lat]];
  }

  const result: [number, number][] = [];

  for (let i = 1; i < nodeChain.length; i += 1) {
    const toId = nodeChain[i];
    const entry = cameFrom.get(toId);
    const edge = entry?.edge;
    if (!edge) continue;

    if (edge.featureIndex === VIRTUAL_FEATURE) {
      const prevNode = nodes.get(nodeChain[i - 1])!;
      appendUnique(result, [prevNode.lng, prevNode.lat]);
      const nextNode = nodes.get(toId)!;
      appendUnique(result, [nextNode.lng, nextNode.lat]);
      continue;
    }

    const lineCoords = features[edge.featureIndex].geometry.coordinates as [number, number][];
    appendPolylineSlice(result, lineCoords, edge.fromIndex, edge.toIndex);
  }

  return result;
}

function runAStar(
  nodes: Map<string, GraphNode>,
  adjacency: Map<string, GraphEdge[]>,
  features: GeoJSON.Feature<GeoJSON.LineString, MapPathProperties>[],
  startId: string,
  endId: string,
  end: LatLng,
): [number, number][] | null {
  if (startId === endId) {
    const node = nodes.get(startId)!;
    return [[node.lng, node.lat]];
  }

  const open = new Set<string>([startId]);
  const cameFrom = new Map<string, CameFromEntry>();
  const gScore = new Map<string, number>();
  for (const id of nodes.keys()) gScore.set(id, Infinity);
  gScore.set(startId, 0);
  cameFrom.set(startId, { prev: null, edge: null });

  const fScore = new Map<string, number>();
  const heuristic = (id: string) => {
    const node = nodes.get(id)!;
    return haversineMeters({ lat: node.lat, lng: node.lng }, end);
  };
  fScore.set(startId, heuristic(startId));

  while (open.size > 0) {
    const current = [...open].sort((a, b) => (fScore.get(a) ?? Infinity) - (fScore.get(b) ?? Infinity))[0];
    if (current === endId) {
      const chain = reconstructNodeChain(cameFrom, endId);
      return expandNodeChain(chain, cameFrom, nodes, features);
    }
    open.delete(current);
    for (const edge of adjacency.get(current) ?? []) {
      const tentative = (gScore.get(current) ?? Infinity) + edge.weight;
      if (tentative < (gScore.get(edge.to) ?? Infinity)) {
        cameFrom.set(edge.to, { prev: current, edge });
        gScore.set(edge.to, tentative);
        fScore.set(edge.to, tentative + heuristic(edge.to));
        open.add(edge.to);
      }
    }
  }

  return null;
}

function assignComponents(
  nodes: Map<string, GraphNode>,
  adjacency: Map<string, GraphEdge[]>,
): Map<string, number> {
  const component = new Map<string, number>();
  let compId = 0;

  for (const startNode of nodes.keys()) {
    if (component.has(startNode)) continue;
    const queue = [startNode];
    component.set(startNode, compId);
    while (queue.length > 0) {
      const current = queue.pop()!;
      for (const edge of adjacency.get(current) ?? []) {
        if (!component.has(edge.to)) {
          component.set(edge.to, compId);
          queue.push(edge.to);
        }
      }
    }
    compId += 1;
  }

  return component;
}

function dijkstraAll(
  nodes: Map<string, GraphNode>,
  adjacency: Map<string, GraphEdge[]>,
  startId: string,
) {
  const dist = new Map<string, number>();
  const cameFrom = new Map<string, CameFromEntry>();
  for (const id of nodes.keys()) dist.set(id, Infinity);
  dist.set(startId, 0);
  cameFrom.set(startId, { prev: null, edge: null });

  const open = new Set<string>([startId]);
  const visited = new Set<string>();

  while (open.size > 0) {
    const current = [...open].sort((a, b) => (dist.get(a) ?? Infinity) - (dist.get(b) ?? Infinity))[0];
    open.delete(current);
    if (visited.has(current)) continue;
    visited.add(current);

    for (const edge of adjacency.get(current) ?? []) {
      const tentative = (dist.get(current) ?? Infinity) + edge.weight;
      if (tentative < (dist.get(edge.to) ?? Infinity)) {
        cameFrom.set(edge.to, { prev: current, edge });
        dist.set(edge.to, tentative);
        open.add(edge.to);
      }
    }
  }

  return { dist, cameFrom };
}

function expandPathBetween(
  cameFrom: Map<string, CameFromEntry>,
  startId: string,
  endId: string,
  nodes: Map<string, GraphNode>,
  features: GeoJSON.Feature<GeoJSON.LineString, MapPathProperties>[],
): [number, number][] | null {
  if (startId === endId) {
    const node = nodes.get(startId)!;
    return [[node.lng, node.lat]];
  }

  const chain: string[] = [];
  let current: string | null = endId;
  while (current) {
    chain.unshift(current);
    current = cameFrom.get(current)?.prev ?? null;
  }
  if (chain[0] !== startId) return null;

  return expandNodeChain(chain, cameFrom, nodes, features);
}

function appendUnique(coords: [number, number][], next: [number, number]) {
  const last = coords[coords.length - 1];
  if (!last || haversineMeters(coordToLatLng(last), coordToLatLng(next)) > 0.5) {
    coords.push(next);
  }
}

function stitchCoords(...parts: [number, number][][]): [number, number][] {
  const result: [number, number][] = [];
  for (const part of parts) {
    for (const coord of part) {
      appendUnique(result, coord);
    }
  }
  return result;
}

function pathLengthMeters(coordinates: [number, number][]): number {
  let distanceMeters = 0;
  for (let i = 0; i < coordinates.length - 1; i += 1) {
    distanceMeters += haversineMeters(
      coordToLatLng(coordinates[i]),
      coordToLatLng(coordinates[i + 1]),
    );
  }
  return distanceMeters;
}

async function composeRouteAsync(
  start: LatLng,
  startSnap: PathSnap,
  drawnCoords: [number, number][],
  endSnap: PathSnap,
  end: LatLng,
  ctx: RouteContext,
): Promise<{ coordinates: [number, number][]; distanceMeters: number; durationSeconds: number } | null> {
  const coordinates: [number, number][] = [];

  if (startSnap.distance > MAX_CONNECTOR_DISTANCE_M || endSnap.distance > MAX_CONNECTOR_DISTANCE_M) {
    return null;
  }
  appendUnique(coordinates, [start.lng, start.lat]);
  appendUnique(coordinates, [startSnap.lng, startSnap.lat]);

  for (const coord of drawnCoords) {
    appendUnique(coordinates, coord);
  }

  appendUnique(coordinates, [endSnap.lng, endSnap.lat]);
  appendUnique(coordinates, [end.lng, end.lat]);

  if (
    routeCrossesFenceZones(coordinates, ctx.fenceZones) ||
    routeCrossesFencePaths(coordinates, ctx.fencePaths)
  ) {
    return null;
  }

  const distanceMeters = pathLengthMeters(coordinates);
  const durationSeconds = walkingDurationSeconds(distanceMeters);

  return {
    coordinates,
    distanceMeters,
    durationSeconds,
  };
}

async function tryGraphRouteAsync(
  paths: MapPathsGeoJson,
  start: LatLng,
  end: LatLng,
  mergeM: number,
  ctx: RouteContext,
): Promise<{ coordinates: [number, number][]; distanceMeters: number; durationSeconds: number } | null> {
  const { nodes, adjacency, features } = buildGraph(paths, mergeM);
  if (nodes.size === 0) return null;

  const connectedPaths: MapPathsGeoJson = { type: 'FeatureCollection', features };
  const startSnap = nearestPointOnPaths(connectedPaths, start);
  const endSnap = nearestPointOnPaths(connectedPaths, end);
  if (!startSnap || !endSnap) return null;

  const startId = attachSnapToGraph(nodes, adjacency, startSnap, mergeM);
  const endId = attachSnapToGraph(nodes, adjacency, endSnap, mergeM);

  if (startSnap.featureIndex === endSnap.featureIndex && startSnap.segmentIndex === endSnap.segmentIndex) {
    return composeRouteAsync(start, startSnap, [[startSnap.lng, startSnap.lat], [endSnap.lng, endSnap.lat]], endSnap, end, ctx);
  }

  const drawnCoords = runAStar(nodes, adjacency, features, startId, endId, end);
  if (!drawnCoords) return null;
  if (routeCrossesFenceZones(drawnCoords, ctx.fenceZones)) return null;

  return composeRouteAsync(start, startSnap, drawnCoords, endSnap, end, ctx);
}

export async function tryBridgedRouteAsync(
  paths: MapPathsGeoJson,
  start: LatLng,
  end: LatLng,
  mergeM: number,
  ctx: RouteContext,
): Promise<{ coordinates: [number, number][]; distanceMeters: number; durationSeconds: number } | null> {
  const { nodes, adjacency, features } = buildGraph(paths, mergeM);
  if (nodes.size === 0) return null;

  const connectedPaths: MapPathsGeoJson = { type: 'FeatureCollection', features };
  const startSnap = nearestPointOnPaths(connectedPaths, start);
  const endSnap = nearestPointOnPaths(connectedPaths, end);
  if (!startSnap || !endSnap) return null;

  const startId = attachSnapToGraph(nodes, adjacency, startSnap, mergeM);
  const endId = attachSnapToGraph(nodes, adjacency, endSnap, mergeM);

  const direct = runAStar(nodes, adjacency, features, startId, endId, end);
  if (direct) {
    if (routeCrossesFenceZones(direct, ctx.fenceZones)) return null;
    return composeRouteAsync(start, startSnap, direct, endSnap, end, ctx);
  }

  const components = assignComponents(nodes, adjacency);
  const startComp = components.get(startId);
  const endComp = components.get(endId);
  if (startComp === undefined || endComp === undefined || startComp === endComp) {
    return null;
  }

  const fromStart = dijkstraAll(nodes, adjacency, startId);
  const fromEnd = dijkstraAll(nodes, adjacency, endId);

  const candidates: { nodeA: string; nodeB: string; total: number }[] = [];

  for (const [nodeA, compA] of components) {
    if (compA !== startComp) continue;
    const distA = fromStart.dist.get(nodeA) ?? Infinity;
    if (!Number.isFinite(distA)) continue;

    for (const [nodeB, compB] of components) {
      if (compB !== endComp) continue;
      const distB = fromEnd.dist.get(nodeB) ?? Infinity;
      if (!Number.isFinite(distB)) continue;
      const coordA = nodes.get(nodeA)!;
      const coordB = nodes.get(nodeB)!;
      const bridge = haversineMeters(
        { lat: coordA.lat, lng: coordA.lng },
        { lat: coordB.lat, lng: coordB.lng },
      );
      candidates.push({ nodeA, nodeB, total: distA + bridge + distB });
    }
  }

  candidates.sort((a, b) => a.total - b.total);

  for (const candidate of candidates.slice(0, 8)) {
    const pathToBridge = expandPathBetween(fromStart.cameFrom, startId, candidate.nodeA, nodes, features);
    const pathFromBridge = expandPathBetween(fromEnd.cameFrom, endId, candidate.nodeB, nodes, features);
    if (!pathToBridge || !pathFromBridge) continue;

    const bridgeFrom = nodes.get(candidate.nodeA)!;
    const bridgeTo = nodes.get(candidate.nodeB)!;
    const bridgeRoute = await fetchWalkingRoute(
      { lat: bridgeFrom.lat, lng: bridgeFrom.lng },
      { lat: bridgeTo.lat, lng: bridgeTo.lng },
      ctx.routeOptions,
    );

    const drawnCoords = stitchCoords(
      pathToBridge,
      bridgeRoute.coordinates,
      [...pathFromBridge].reverse(),
    );
    if (routeCrossesFenceZones(drawnCoords, ctx.fenceZones)) continue;

    const composed = await composeRouteAsync(start, startSnap, drawnCoords, endSnap, end, ctx);
    if (composed) return composed;
  }

  return null;
}

/** Route strictly along the connected visitor path network. */
export async function findInternalPathAsync(
  paths: MapPathsGeoJson | undefined,
  start: LatLng,
  end: LatLng,
  mapZones?: MapZonesGeoJson,
): Promise<{ coordinates: [number, number][]; distanceMeters: number; durationSeconds: number } | null> {
  if (!paths?.features.length) return null;

  const ctx = createRouteContext(mapZones, paths);

  for (const mergeM of MERGE_STEPS_M) {
    const exact = await tryGraphRouteAsync(paths, start, end, mergeM, ctx);
    if (exact) return exact;
  }

  return null;
}

export { walkingDurationSeconds } from './externalRouting';
