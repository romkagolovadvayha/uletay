import type {
  LatLng,
  MapPoiCategory,
  MapPoiProperties,
  MapPoisGeoJson,
  MapZoneProperties,
  MapZonesGeoJson,
} from '../../types/map';
import { haversineMeters } from './geo';
import { zoneTargetPoint } from './zoneGeo';

type PoiFeature = GeoJSON.Feature<GeoJSON.Point, MapPoiProperties>;
type ZoneFeature = GeoJSON.Feature<GeoJSON.Polygon, MapZoneProperties>;

const SERVICE_MEDICAL_RE = /мед|скорая|перв\S* помощ|doctor|medical/i;
const SERVICE_SECURITY_RE = /охран|безопас|полици|мчс|security/i;

function stageIdForName(name: string): string | undefined {
  const normalized = name.toLocaleLowerCase('ru-RU');
  if (normalized.includes('рен')) return 'ren-tv';
  if (normalized.includes('запад')) return 'west';
  if (normalized.includes('юж')) return 'south';
  return undefined;
}

export function zonePoiCategory(zone: ZoneFeature): MapPoiCategory | null {
  const { zoneType, name } = zone.properties;
  switch (zoneType) {
    case 'stage_area':
      return 'stage';
    case 'trade':
      return 'foodcourt';
    case 'toilet':
      return 'toilet';
    case 'shower':
      return 'shower';
    case 'water':
      return 'water';
    case 'parking':
    case 'autocamp':
      return 'parking';
    case 'service':
      if (SERVICE_MEDICAL_RE.test(name)) return 'medical';
      if (SERVICE_SECURITY_RE.test(name)) return 'security';
      return 'info';
    case 'building':
    case 'custom':
    case 'camping':
    case 'comfort':
      return 'custom';
    default:
      return null;
  }
}

function syntheticPoiFromZone(zone: ZoneFeature): PoiFeature | null {
  const category = zonePoiCategory(zone);
  if (!category) return null;
  const target = zoneTargetPoint(zone);
  const stageId = category === 'stage' ? stageIdForName(zone.properties.name) : undefined;

  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [target.lng, target.lat],
    },
    properties: {
      id: `zone-poi:${zone.properties.id}`,
      name: zone.properties.name,
      category,
      description: zone.properties.description,
      accessPoint: target,
      link: stageId ? { type: 'stage', id: stageId } : { type: 'none' },
      status: 'unknown',
      sourceZoneId: zone.properties.id,
    },
  };
}

/**
 * Older map publications stored toilets, water, medical points and stages as
 * polygons only. Expose them as tappable POIs without mutating the CMS payload.
 */
export function withOperationalPois(
  zones?: MapZonesGeoJson,
  pois?: MapPoisGeoJson,
): MapPoisGeoJson {
  const explicit = pois?.features ?? [];
  const explicitIds = new Set(explicit.map((feature) => feature.properties.id));
  const explicitZoneIds = new Set(
    explicit
      .map((feature) => feature.properties.sourceZoneId ?? (
        feature.properties.id.startsWith('zone-poi:')
          ? feature.properties.id.slice('zone-poi:'.length)
          : null))
      .filter((value): value is string => Boolean(value)),
  );

  const derived = (zones?.features ?? [])
    .filter(
      (zone) =>
        !explicitIds.has(`zone-poi:${zone.properties.id}`) &&
        !explicitZoneIds.has(zone.properties.id),
    )
    .map((zone) => syntheticPoiFromZone(zone as ZoneFeature))
    .filter((feature): feature is PoiFeature => feature != null);

  return {
    type: 'FeatureCollection',
    features: [...explicit, ...derived],
  };
}

export function poiCoordinate(poi: PoiFeature): LatLng {
  return (
    poi.properties.accessPoint ?? {
      lat: poi.geometry.coordinates[1],
      lng: poi.geometry.coordinates[0],
    }
  );
}

export function nearestPois(
  pois: MapPoisGeoJson | undefined,
  category: MapPoiCategory,
  origin: LatLng,
  limit = 3,
): PoiFeature[] {
  return (pois?.features ?? [])
    .filter(
      (feature): feature is PoiFeature =>
        feature.properties.category === category && feature.properties.status !== 'closed',
    )
    .map((feature) => ({
      feature,
      distance: haversineMeters(origin, poiCoordinate(feature)),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map(({ feature }) => feature);
}
