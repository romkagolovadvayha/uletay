import { nearestPointOnLine } from '@turf/nearest-point-on-line';
import { lineString, point } from '@turf/helpers';
import type { LatLng, MapPathProperties, MapPathsGeoJson } from '../../types/map';
import { haversineMeters, coordToLatLng } from './geo';

type GraphNode = {
  id: string;
  lng: number;
  lat: number;
};

type GraphEdge = {
  to: string;
  weight: number;
};

type PathSnap = {
  lng: number;
  lat: number;
  distance: number;
  segment: [[number, number], [number, number]];
  featureIndex: number;
  segmentIndex: number;
};

/** Only draw off-road connectors when start/end is farther than this from a path. */
const CONNECTOR_THRESHOLD_M = 10;
const MERGE_STEPS_M = [12, 28, 45] as const;

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
): string {
  const existing = findExistingNodeId(nodes, lng, lat, mergeM);
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
) {
  if (from === to || weight <= 0) return;
  const list = adjacency.get(from) ?? [];
  list.push({ to, weight });
  adjacency.set(from, list);
}

/** Only roads and walkways are walkable; fence lines are decorative barriers. */
function isRoutablePath(
  feature: GeoJSON.Feature<GeoJSON.LineString, MapPathProperties>,
): boolean {
  return feature.properties.pathKind !== 'fence';
}

function routableFeatures(paths?: MapPathsGeoJson) {
  return (paths?.features ?? []).filter(
    (f): f is GeoJSON.Feature<GeoJSON.LineString, MapPathProperties> =>
      f.geometry.type === 'LineString' &&
      f.geometry.coordinates.length >= 2 &&
      isRoutablePath(f as GeoJSON.Feature<GeoJSON.LineString, MapPathProperties>),
  );
}

export function buildGraph(paths: MapPathsGeoJson | undefined, mergeM: number = MERGE_STEPS_M[0]) {
  const nodes = new Map<string, GraphNode>();
  const adjacency = new Map<string, GraphEdge[]>();

  for (const feature of routableFeatures(paths)) {
    const coords = feature.geometry.coordinates;
    for (let i = 0; i < coords.length - 1; i += 1) {
      const [lng1, lat1] = coords[i];
      const [lng2, lat2] = coords[i + 1];
      const a = getOrCreateNode(nodes, lng1, lat1, mergeM);
      const b = getOrCreateNode(nodes, lng2, lat2, mergeM);
      const weight = haversineMeters(
        { lat: lat1, lng: lng1 },
        { lat: lat2, lng: lng2 },
      );
      addEdge(adjacency, a, b, weight);
      addEdge(adjacency, b, a, weight);
    }
  }

  return { nodes, adjacency };
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
  const snapId = getOrCreateNode(nodes, snap.lng, snap.lat, mergeM);
  const [start, end] = snap.segment;
  const startId = getOrCreateNode(nodes, start[0], start[1], mergeM);
  const endId = getOrCreateNode(nodes, end[0], end[1], mergeM);

  const toStart = haversineMeters({ lat: snap.lat, lng: snap.lng }, coordToLatLng(start));
  const toEnd = haversineMeters({ lat: snap.lat, lng: snap.lng }, coordToLatLng(end));

  addEdge(adjacency, snapId, startId, toStart);
  addEdge(adjacency, startId, snapId, toStart);
  addEdge(adjacency, snapId, endId, toEnd);
  addEdge(adjacency, endId, snapId, toEnd);

  return snapId;
}

function reconstructPath(
  cameFrom: Map<string, string | null>,
  endId: string,
  nodes: Map<string, GraphNode>,
): [number, number][] {
  const chain: string[] = [];
  let current: string | null = endId;
  while (current) {
    chain.unshift(current);
    current = cameFrom.get(current) ?? null;
  }
  return chain.map((id) => {
    const node = nodes.get(id)!;
    return [node.lng, node.lat] as [number, number];
  });
}

function runAStar(
  nodes: Map<string, GraphNode>,
  adjacency: Map<string, GraphEdge[]>,
  startId: string,
  endId: string,
  end: LatLng,
): [number, number][] | null {
  if (startId === endId) {
    const node = nodes.get(startId)!;
    return [[node.lng, node.lat]];
  }

  const open = new Set<string>([startId]);
  const cameFrom = new Map<string, string | null>();
  const gScore = new Map<string, number>();
  for (const id of nodes.keys()) gScore.set(id, Infinity);
  gScore.set(startId, 0);
  cameFrom.set(startId, null);

  const fScore = new Map<string, number>();
  const heuristic = (id: string) => {
    const node = nodes.get(id)!;
    return haversineMeters({ lat: node.lat, lng: node.lng }, end);
  };
  fScore.set(startId, heuristic(startId));

  while (open.size > 0) {
    const current = [...open].sort((a, b) => (fScore.get(a) ?? Infinity) - (fScore.get(b) ?? Infinity))[0];
    if (current === endId) {
      return reconstructPath(cameFrom, endId, nodes);
    }
    open.delete(current);
    for (const edge of adjacency.get(current) ?? []) {
      const tentative = (gScore.get(current) ?? Infinity) + edge.weight;
      if (tentative < (gScore.get(edge.to) ?? Infinity)) {
        cameFrom.set(edge.to, current);
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
  const prev = new Map<string, string | null>();
  for (const id of nodes.keys()) dist.set(id, Infinity);
  dist.set(startId, 0);
  prev.set(startId, null);

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
        dist.set(edge.to, tentative);
        prev.set(edge.to, current);
        open.add(edge.to);
      }
    }
  }

  return { dist, prev };
}

function pathFromPrev(
  prev: Map<string, string | null>,
  startId: string,
  endId: string,
  nodes: Map<string, GraphNode>,
): [number, number][] | null {
  if (startId === endId) {
    const node = nodes.get(startId)!;
    return [[node.lng, node.lat]];
  }
  if (!prev.has(endId)) return null;

  const chain: string[] = [];
  let current: string | null = endId;
  while (current) {
    chain.unshift(current);
    current = prev.get(current) ?? null;
  }
  if (chain[0] !== startId) return null;

  return chain.map((id) => {
    const node = nodes.get(id)!;
    return [node.lng, node.lat] as [number, number];
  });
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

function composeRoute(
  start: LatLng,
  startSnap: PathSnap,
  roadCoords: [number, number][],
  endSnap: PathSnap,
  end: LatLng,
): { coordinates: [number, number][]; distanceMeters: number } {
  const coordinates: [number, number][] = [];

  appendUnique(coordinates, [start.lng, start.lat]);
  if (startSnap.distance > CONNECTOR_THRESHOLD_M) {
    appendUnique(coordinates, [startSnap.lng, startSnap.lat]);
  }

  for (const coord of roadCoords) {
    appendUnique(coordinates, coord);
  }

  if (endSnap.distance > CONNECTOR_THRESHOLD_M) {
    appendUnique(coordinates, [endSnap.lng, endSnap.lat]);
  }
  appendUnique(coordinates, [end.lng, end.lat]);

  return {
    coordinates,
    distanceMeters: pathLengthMeters(coordinates),
  };
}

function tryGraphRoute(
  paths: MapPathsGeoJson,
  start: LatLng,
  end: LatLng,
  mergeM: number,
): { coordinates: [number, number][]; distanceMeters: number } | null {
  const { nodes, adjacency } = buildGraph(paths, mergeM);
  if (nodes.size === 0) return null;

  const startSnap = nearestPointOnPaths(paths, start);
  const endSnap = nearestPointOnPaths(paths, end);
  if (!startSnap || !endSnap) return null;

  const startId = attachSnapToGraph(nodes, adjacency, startSnap, mergeM);
  const endId = attachSnapToGraph(nodes, adjacency, endSnap, mergeM);

  const roadCoords = runAStar(nodes, adjacency, startId, endId, end);
  if (!roadCoords) return null;

  return composeRoute(start, startSnap, roadCoords, endSnap, end);
}

function tryBridgedRoute(
  paths: MapPathsGeoJson,
  start: LatLng,
  end: LatLng,
  mergeM: number,
): { coordinates: [number, number][]; distanceMeters: number } | null {
  const { nodes, adjacency } = buildGraph(paths, mergeM);
  if (nodes.size === 0) return null;

  const startSnap = nearestPointOnPaths(paths, start);
  const endSnap = nearestPointOnPaths(paths, end);
  if (!startSnap || !endSnap) return null;

  const startId = attachSnapToGraph(nodes, adjacency, startSnap, mergeM);
  const endId = attachSnapToGraph(nodes, adjacency, endSnap, mergeM);

  const direct = runAStar(nodes, adjacency, startId, endId, end);
  if (direct) {
    return composeRoute(start, startSnap, direct, endSnap, end);
  }

  const components = assignComponents(nodes, adjacency);
  const startComp = components.get(startId);
  const endComp = components.get(endId);
  if (startComp === undefined || endComp === undefined || startComp === endComp) {
    return null;
  }

  const fromStart = dijkstraAll(nodes, adjacency, startId);
  const fromEnd = dijkstraAll(nodes, adjacency, endId);

  let bestNodeA: string | null = null;
  let bestNodeB: string | null = null;
  let bestTotal = Infinity;

  for (const [nodeA, compA] of components) {
    if (compA !== startComp) continue;
    const distA = fromStart.dist.get(nodeA) ?? Infinity;
    if (!Number.isFinite(distA)) continue;
    const coordA = nodes.get(nodeA)!;

    for (const [nodeB, compB] of components) {
      if (compB !== endComp) continue;
      const distB = fromEnd.dist.get(nodeB) ?? Infinity;
      if (!Number.isFinite(distB)) continue;
      const coordB = nodes.get(nodeB)!;
      const bridge = haversineMeters(
        { lat: coordA.lat, lng: coordA.lng },
        { lat: coordB.lat, lng: coordB.lng },
      );
      const total = distA + bridge + distB;
      if (total < bestTotal) {
        bestTotal = total;
        bestNodeA = nodeA;
        bestNodeB = nodeB;
      }
    }
  }

  if (!bestNodeA || !bestNodeB) return null;

  const pathToBridge = pathFromPrev(fromStart.prev, startId, bestNodeA, nodes);
  const pathFromBridge = pathFromPrev(fromEnd.prev, endId, bestNodeB, nodes);
  if (!pathToBridge || !pathFromBridge) return null;

  const bridgeNode = nodes.get(bestNodeB)!;
  const roadCoords = stitchCoords(pathToBridge, [[bridgeNode.lng, bridgeNode.lat]], [...pathFromBridge].reverse());

  return composeRoute(start, startSnap, roadCoords, endSnap, end);
}

function slicePolyline(
  coords: [number, number][],
  fromIndex: number,
  toIndex: number,
): [number, number][] {
  if (fromIndex === toIndex) {
    return [coords[fromIndex]];
  }
  if (fromIndex < toIndex) {
    return coords.slice(fromIndex, toIndex + 1);
  }
  return coords.slice(toIndex, fromIndex + 1).reverse();
}

function tryPolylineRoute(
  paths: MapPathsGeoJson,
  start: LatLng,
  end: LatLng,
): { coordinates: [number, number][]; distanceMeters: number } | null {
  const features = routableFeatures(paths);
  if (features.length === 0) return null;

  const startSnap = nearestPointOnPaths(paths, start);
  const endSnap = nearestPointOnPaths(paths, end);
  if (!startSnap || !endSnap) return null;

  const startFeature = features[startSnap.featureIndex];
  const endFeature = features[endSnap.featureIndex];
  const startCoords = startFeature.geometry.coordinates as [number, number][];
  const endCoords = endFeature.geometry.coordinates as [number, number][];

  let roadCoords: [number, number][];

  if (startFeature === endFeature) {
    roadCoords = slicePolyline(startCoords, startSnap.segmentIndex, endSnap.segmentIndex);
    roadCoords = stitchCoords([[startSnap.lng, startSnap.lat]], roadCoords, [[endSnap.lng, endSnap.lat]]);
  } else {
    const startEndIdx = startCoords.length - 1;
    const endEndIdx = endCoords.length - 1;
    const startCandidates = [
      { idx: 0, coord: startCoords[0] },
      { idx: startEndIdx, coord: startCoords[startEndIdx] },
    ];
    const endCandidates = [
      { idx: 0, coord: endCoords[0] },
      { idx: endEndIdx, coord: endCoords[endEndIdx] },
    ];

    let bestLegs: [number, number][] | null = null;
    let bestDist = Infinity;

    for (const startCandidate of startCandidates) {
      const legA = slicePolyline(startCoords, startSnap.segmentIndex, startCandidate.idx);
      legA[0] = [startSnap.lng, startSnap.lat];

      for (const endCandidate of endCandidates) {
        const legB = slicePolyline(endCoords, endCandidate.idx, endSnap.segmentIndex);
        legB[legB.length - 1] = [endSnap.lng, endSnap.lat];
        const bridge = haversineMeters(
          coordToLatLng(startCandidate.coord),
          coordToLatLng(endCandidate.coord),
        );
        const total =
          pathLengthMeters(legA) + bridge + pathLengthMeters(legB);
        if (total < bestDist) {
          bestDist = total;
          bestLegs = stitchCoords(legA, [endCandidate.coord], legB);
        }
      }
    }

    if (!bestLegs) return null;
    roadCoords = bestLegs;
  }

  return composeRoute(start, startSnap, roadCoords, endSnap, end);
}

function tryConnectorRoute(
  paths: MapPathsGeoJson | undefined,
  start: LatLng,
  end: LatLng,
): { coordinates: [number, number][]; distanceMeters: number } {
  const startSnap = nearestPointOnPaths(paths, start);
  const endSnap = nearestPointOnPaths(paths, end);

  if (startSnap && endSnap) {
    const roadCoords: [number, number][] = [
      [startSnap.lng, startSnap.lat],
      [endSnap.lng, endSnap.lat],
    ];
    return composeRoute(start, startSnap, roadCoords, endSnap, end);
  }

  return {
    coordinates: [
      [start.lng, start.lat],
      [end.lng, end.lat],
    ],
    distanceMeters: haversineMeters(start, end),
  };
}

/**
 * Route along drawn map paths when possible; otherwise approximate via nearest roads.
 */
export function findInternalPath(
  paths: MapPathsGeoJson | undefined,
  start: LatLng,
  end: LatLng,
): { coordinates: [number, number][]; distanceMeters: number } | null {
  if (!paths?.features.length) {
    return tryConnectorRoute(paths, start, end);
  }

  for (const mergeM of MERGE_STEPS_M) {
    const exact = tryGraphRoute(paths, start, end, mergeM);
    if (exact) return exact;
  }

  for (const mergeM of MERGE_STEPS_M) {
    const bridged = tryBridgedRoute(paths, start, end, mergeM);
    if (bridged) return bridged;
  }

  const polyline = tryPolylineRoute(paths, start, end);
  if (polyline) return polyline;

  return tryConnectorRoute(paths, start, end);
}

export function walkingDurationSeconds(distanceMeters: number): number {
  return distanceMeters / 1.4;
}
