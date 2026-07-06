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

const SNAP_THRESHOLD_M = 45;
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
  const list = adjacency.get(from) ?? [];
  list.push({ to, weight });
  adjacency.set(from, list);
}

export function buildGraph(paths?: MapPathsGeoJson) {
  const nodes = new Map<string, GraphNode>();
  const adjacency = new Map<string, GraphEdge[]>();

  for (const feature of paths?.features ?? []) {
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

function nearestNodeOnGraph(
  point: { lat: number; lng: number },
  nodes: Map<string, GraphNode>,
): { nodeId: string; distance: number } | null {
  let best: { nodeId: string; distance: number } | null = null;
  for (const node of nodes.values()) {
    const distance = haversineMeters(point, { lat: node.lat, lng: node.lng });
    if (!best || distance < best.distance) {
      best = { nodeId: node.id, distance };
    }
  }
  return best;
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

export function findInternalPath(
  paths: MapPathsGeoJson | undefined,
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
): { coordinates: [number, number][]; distanceMeters: number } | null {
  const { nodes, adjacency } = buildGraph(paths);
  if (nodes.size === 0) return null;

  const startSnap = nearestNodeOnGraph(start, nodes);
  const endSnap = nearestNodeOnGraph(end, nodes);
  if (!startSnap || !endSnap) return null;
  if (startSnap.distance > SNAP_THRESHOLD_M || endSnap.distance > SNAP_THRESHOLD_M) {
    return null;
  }

  const startId = startSnap.nodeId;
  const endId = endSnap.nodeId;

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

export function walkingDurationSeconds(distanceMeters: number): number {
  return distanceMeters / 1.4;
}
