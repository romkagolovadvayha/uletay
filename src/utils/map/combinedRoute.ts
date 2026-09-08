import { ROAD_ENTRANCE } from '../../data/festivalMap';
import type {
  CombinedRoute,
  FestivalMapConfig,
  LatLng,
  MapPathsGeoJson,
  MapPoisGeoJson,
  MapZonesGeoJson,
  MapPoiProperties,
  RouteSegment,
} from '../../types/map';
import { fetchDrivingRoute } from './externalRouting';
import { formatDistance, formatDuration, haversineMeters, isInsideTerritory } from './geo';
import { findInternalPathAsync } from './pathfinding';

function poiCoord(poi: GeoJSON.Feature<GeoJSON.Point, MapPoiProperties>): LatLng {
  if (poi.properties.accessPoint) return poi.properties.accessPoint;
  const [lng, lat] = poi.geometry.coordinates;
  return { lat, lng };
}

type EntranceTarget = { name: string; point: LatLng };
type RoutableEntrance = EntranceTarget & {
  internal: NonNullable<Awaited<ReturnType<typeof findInternalPathAsync>>>;
};

function entranceTargets(pois?: MapPoisGeoJson): EntranceTarget[] {
  const open = (pois?.features ?? []).filter(f => f.properties.status !== 'closed');
  const entrances = open.filter(f => f.properties.category === 'entrance');
  const fromPois = (entrances.length ? entrances : open.filter(f => f.properties.category === 'parking'))
    .map(feature => ({ name: feature.properties.name, point: poiCoord(feature) }));
  return fromPois.length > 0
    ? fromPois
    : [{ name: 'Главный вход', point: ROAD_ENTRANCE }];
}

function nearestEntrance<T extends EntranceTarget>(from: LatLng, targets: T[]): T | null {
  if (targets.length === 0) return null;
  let best = targets[0];
  let bestDist = Infinity;
  for (const t of targets) {
    const d = haversineMeters(from, t.point);
    if (d < bestDist) {
      bestDist = d;
      best = t;
    }
  }
  return best;
}

async function routableEntrances(
  entrances: EntranceTarget[],
  target: LatLng,
  paths?: MapPathsGeoJson,
  zones?: MapZonesGeoJson,
): Promise<RoutableEntrance[]> {
  const candidates = await Promise.all(entrances.map(async (entrance) => ({
    ...entrance,
    internal: await findInternalPathAsync(paths, entrance.point, target, zones),
  })));
  return candidates.filter((candidate): candidate is RoutableEntrance => candidate.internal !== null);
}

export async function buildCombinedRouteToTarget(options: {
  userLocation: LatLng | null;
  target: LatLng;
  targetName: string;
  mapConfig?: FestivalMapConfig;
  mapPaths?: MapPathsGeoJson;
  mapPois?: MapPoisGeoJson;
  mapZones?: MapZonesGeoJson;
}): Promise<CombinedRoute | null> {
  const target = options.target;
  const segments: RouteSegment[] = [];
  let internalOriginName: string | null = null;
  const inside =
    options.userLocation &&
    isInsideTerritory(options.userLocation, options.mapConfig);

  if (options.userLocation && !inside) {
    const candidates = await routableEntrances(
      entranceTargets(options.mapPois),
      target,
      options.mapPaths,
      options.mapZones,
    );
    const entrance = nearestEntrance(options.userLocation, candidates);
    if (!entrance) return null;
    const external = await fetchDrivingRoute(options.userLocation, entrance.point);
    segments.push({
      kind: 'external',
      coordinates: external.coordinates,
      distanceMeters: external.distanceMeters,
      durationSeconds: external.durationSeconds,
    });
    segments.push({
      kind: 'internal',
      coordinates: entrance.internal.coordinates,
      distanceMeters: entrance.internal.distanceMeters,
      durationSeconds: entrance.internal.durationSeconds,
    });
  } else if (options.userLocation) {
    const internal = await findInternalPathAsync(options.mapPaths, options.userLocation, target, options.mapZones);
    if (!internal) return null;
    segments.push({
      kind: 'internal',
      coordinates: internal.coordinates,
      distanceMeters: internal.distanceMeters,
      durationSeconds: internal.durationSeconds,
    });
  } else {
    const entrances = entranceTargets(options.mapPois);
    const [entrance] = await routableEntrances(entrances, target, options.mapPaths, options.mapZones);
    if (!entrance) return null;
    internalOriginName = entrance.name;
    segments.push({
      kind: 'internal',
      coordinates: entrance.internal.coordinates,
      distanceMeters: entrance.internal.distanceMeters,
      durationSeconds: entrance.internal.durationSeconds,
    });
  }

  if (segments.length === 0) return null;

  const totalDistanceMeters = segments.reduce((s, seg) => s + seg.distanceMeters, 0);
  const totalDurationSeconds = segments.reduce((s, seg) => s + seg.durationSeconds, 0);

  const externalSeg = segments.find((s) => s.kind === 'external');
  const internalSeg = segments.find((s) => s.kind === 'internal');

  let summary = '';
  if (externalSeg && internalSeg) {
    summary = `${formatDistance(externalSeg.distanceMeters)} на машине до въезда (${formatDuration(externalSeg.durationSeconds)}), затем ${formatDistance(internalSeg.distanceMeters)} пешком до объекта «${options.targetName}» (${formatDuration(internalSeg.durationSeconds)})`;
  } else if (externalSeg) {
    summary = `На машине → ${options.targetName}`;
  } else if (internalSeg) {
    summary = options.userLocation
      ? `Пешком → ${options.targetName}`
      : `От входа «${internalOriginName ?? 'Главный вход'}» → ${options.targetName}`;
  }

  return {
    segments,
    totalDistanceMeters,
    totalDurationSeconds,
    summary,
  };
}

export async function buildCombinedRoute(options: {
  userLocation: LatLng | null;
  targetPoi: GeoJSON.Feature<GeoJSON.Point, MapPoiProperties>;
  mapConfig?: FestivalMapConfig;
  mapPaths?: MapPathsGeoJson;
  mapPois?: MapPoisGeoJson;
  mapZones?: MapZonesGeoJson;
}): Promise<CombinedRoute | null> {
  return buildCombinedRouteToTarget({
    userLocation: options.userLocation,
    target: poiCoord(options.targetPoi),
    targetName: options.targetPoi.properties.name,
    mapConfig: options.mapConfig,
    mapPaths: options.mapPaths,
    mapPois: options.mapPois,
    mapZones: options.mapZones,
  });
}

export function allRouteCoordinates(route: CombinedRoute): [number, number][] {
  return route.segments.flatMap((s) => s.coordinates);
}
