import type {
  CombinedRoute,
  FestivalMapConfig,
  LatLng,
  MapPathsGeoJson,
  MapPoisGeoJson,
  MapPoiProperties,
  RouteSegment,
} from '../../types/map';
import { fetchDrivingRoute, straightLineFallback } from './externalRouting';
import { formatDistance, formatDuration, haversineMeters, isInsideTerritory } from './geo';
import { findInternalPath, walkingDurationSeconds } from './pathfinding';

function poiCoord(poi: GeoJSON.Feature<GeoJSON.Point, MapPoiProperties>): LatLng {
  const [lng, lat] = poi.geometry.coordinates;
  return { lat, lng };
}

function entranceTargets(pois?: MapPoisGeoJson): LatLng[] {
  return (pois?.features ?? [])
    .filter((f) => f.properties.category === 'entrance' || f.properties.category === 'parking')
    .map(poiCoord);
}

function nearestTarget(from: LatLng, targets: LatLng[]): LatLng {
  if (targets.length === 0) return from;
  let best = targets[0];
  let bestDist = Infinity;
  for (const t of targets) {
    const d = haversineMeters(from, t);
    if (d < bestDist) {
      bestDist = d;
      best = t;
    }
  }
  return best;
}

export async function buildCombinedRouteToTarget(options: {
  userLocation: LatLng | null;
  target: LatLng;
  targetName: string;
  mapConfig?: FestivalMapConfig;
  mapPaths?: MapPathsGeoJson;
  mapPois?: MapPoisGeoJson;
}): Promise<CombinedRoute | null> {
  const target = options.target;
  const segments: RouteSegment[] = [];
  const inside =
    options.userLocation &&
    isInsideTerritory(options.userLocation, options.mapConfig);

  if (options.userLocation && !inside) {
    const entrance = nearestTarget(options.userLocation, entranceTargets(options.mapPois));
    const external =
      (await fetchDrivingRoute(options.userLocation, entrance)) ??
      straightLineFallback(options.userLocation, entrance);
    segments.push({
      kind: 'external',
      coordinates: external.coordinates,
      distanceMeters: external.distanceMeters,
      durationSeconds: external.durationSeconds,
    });

    const internalStart = {
      lat: entrance.lat,
      lng: entrance.lng,
    };
    const internal = findInternalPath(options.mapPaths, internalStart, target);
    if (internal) {
      segments.push({
        kind: 'internal',
        coordinates: internal.coordinates,
        distanceMeters: internal.distanceMeters,
        durationSeconds: walkingDurationSeconds(internal.distanceMeters),
      });
    }
  } else if (options.userLocation) {
    const internal = findInternalPath(options.mapPaths, options.userLocation, target);
    if (internal) {
      segments.push({
        kind: 'internal',
        coordinates: internal.coordinates,
        distanceMeters: internal.distanceMeters,
        durationSeconds: walkingDurationSeconds(internal.distanceMeters),
      });
    }
  } else {
    const entrances = entranceTargets(options.mapPois);
    const start = entrances[0] ?? target;
    const internal = findInternalPath(options.mapPaths, start, target);
    if (internal) {
      segments.push({
        kind: 'internal',
        coordinates: internal.coordinates,
        distanceMeters: internal.distanceMeters,
        durationSeconds: walkingDurationSeconds(internal.distanceMeters),
      });
    }
  }

  if (segments.length === 0) return null;

  const totalDistanceMeters = segments.reduce((s, seg) => s + seg.distanceMeters, 0);
  const totalDurationSeconds = segments.reduce((s, seg) => s + seg.durationSeconds, 0);

  const externalSeg = segments.find((s) => s.kind === 'external');
  const internalSeg = segments.find((s) => s.kind === 'internal');

  let summary = '';
  if (externalSeg && internalSeg) {
    summary = `${formatDistance(externalSeg.distanceMeters)} на машине до въезда, затем ${formatDistance(internalSeg.distanceMeters)} пешком по дорогам и тропинкам до ${options.targetName}`;
  } else if (externalSeg) {
    summary = `${formatDistance(externalSeg.distanceMeters)} на машине до ${options.targetName}`;
  } else if (internalSeg) {
    summary = `${formatDistance(internalSeg.distanceMeters)} пешком по дорогам и тропинкам до ${options.targetName} (~${formatDuration(internalSeg.durationSeconds)})`;
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
}): Promise<CombinedRoute | null> {
  return buildCombinedRouteToTarget({
    userLocation: options.userLocation,
    target: poiCoord(options.targetPoi),
    targetName: options.targetPoi.properties.name,
    mapConfig: options.mapConfig,
    mapPaths: options.mapPaths,
    mapPois: options.mapPois,
  });
}

export function allRouteCoordinates(route: CombinedRoute): [number, number][] {
  return route.segments.flatMap((s) => s.coordinates);
}
