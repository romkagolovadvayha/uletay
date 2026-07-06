import { nearestPointOnLine } from '@turf/nearest-point-on-line';
import { lineString, point } from '@turf/helpers';
import type { MapPathsGeoJson } from '../../types/map';
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

/** Max distance from a road/path to snap user or building target. */
const SNAP_THRESHOLD_M = 180;
const NODE_MERGE_M = 2;

function nodeKey(lng: number, lat: number): string {
  return `${lng.toFixed(6)},${lat.toFixed(6)}`;
}

function findExistingNodeId(
  nodes: Map<string, GraphNode>,
  lng: number,
  lat: number,
): string | null {
  for (const node of nodes.values()) {
    if (haversineMeters(coordToLatLng([lng, lat]), { lat: node.lat, lng: node.lng }) <= NODE_MERGE_M) {
      return node.id;
    }
  }
  return null;
}

function getOrCreateNode(
  nodes: Map<string, GraphNode>,
  lng: number,
  lat: number,
): string {
  const existing = findExistingNodeId(nodes, lng, lat);
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

export function buildGraph(paths?: MapPathsGeoJson) {
  const nodes = new Map<string, GraphNode>();
  const adjacency = new Map<string, GraphEdge[]>();

  for (const feature of paths?.features ?? []) {
    if (feature.geometry.type !== 'LineString') continue;
    const coords = feature.geometry.coordinates;
    for (let i = 0; i < coords.length - 1; i += 1) {
      const [lng1, lat1] = coords[i];
      const [lng2, lat2] = coords[i + 1];
      const a = getOrCreateNode(nodes, lng1, lat1);
      const b = getOrCreateNode(nodes, lng2, lat2);
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

type PathSnap = {
  lng: number;
  lat: number;
  distance: number;
  segment: [[number, number], [number, number]];
};

function nearestPointOnPaths(
  paths: MapPathsGeoJson | undefined,
  target: { lat: number; lng: number },
): PathSnap | null {
  let best: PathSnap | null = null;
  const targetPoint = point([target.lng, target.lat]);

  for (const feature of paths?.features ?? []) {
    if (feature.geometry.type !== 'LineString' || feature.geometry.coordinates.length < 2) continue;
    const coords = feature.geometry.coordinates as [number, number][];
    const nearest = nearestPointOnLine(lineString(coords), targetPoint);
    const [lng, lat] = nearest.geometry.coordinates;
    const distance = haversineMeters(target, { lat, lng });
    if (!best || distance < best.distance) {
      const segmentIndex = Math.max(
        0,
        Math.min(coords.length - 2, Number(nearest.properties.index ?? 0)),
      );
      best = {
        lng,
        lat,
        distance,
        segment: [coords[segmentIndex], coords[segmentIndex + 1]],
      };
    }
  }

  return best;
}

function attachSnapToGraph(
  nodes: Map<string, GraphNode>,
  adjacency: Map<string, GraphEdge[]>,
  snap: PathSnap,
): string | null {
  if (snap.distance > SNAP_THRESHOLD_M) return null;

  const snapId = getOrCreateNode(nodes, snap.lng, snap.lat);
  const [start, end] = snap.segment;
  const startId = getOrCreateNode(nodes, start[0], start[1]);
  const endId = getOrCreateNode(nodes, end[0], end[1]);

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
  end: { lat: number; lng: number },
): { coordinates: [number, number][]; distanceMeters: number } | null {
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
    let current = [...open].sort((a, b) => (fScore.get(a) ?? Infinity) - (fScore.get(b) ?? Infinity))[0];
    if (current === endId) {
      const coordinates = reconstructPath(cameFrom, endId, nodes);
      let distanceMeters = 0;
      for (let i = 0; i < coordinates.length - 1; i += 1) {
        distanceMeters += haversineMeters(
          coordToLatLng(coordinates[i]),
          coordToLatLng(coordinates[i + 1]),
        );
      }
      return { coordinates, distanceMeters };
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

function straightLinePath(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
): { coordinates: [number, number][]; distanceMeters: number } {
  const coordinates: [number, number][] = [
    [start.lng, start.lat],
    [end.lng, end.lat],
  ];
  return {
    coordinates,
    distanceMeters: haversineMeters(start, end),
  };
}

export function findInternalPath(
  paths: MapPathsGeoJson | undefined,
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
): { coordinates: [number, number][]; distanceMeters: number } {
  const { nodes, adjacency } = buildGraph(paths);
  if (nodes.size === 0) {
    return straightLinePath(start, end);
  }

  const startSnap = nearestPointOnPaths(paths, start);
  const endSnap = nearestPointOnPaths(paths, end);
  if (!startSnap || !endSnap) {
    return straightLinePath(start, end);
  }

  const startId = attachSnapToGraph(nodes, adjacency, startSnap);
  const endId = attachSnapToGraph(nodes, adjacency, endSnap);
  if (!startId || !endId) {
    return straightLinePath(start, end);
  }

  const routed = runAStar(nodes, adjacency, startId, endId, end);
  if (routed) {
    return routed;
  }

  return straightLinePath(start, end);
}

export function walkingDurationSeconds(distanceMeters: number): number {
  return distanceMeters / 1.4;
}
