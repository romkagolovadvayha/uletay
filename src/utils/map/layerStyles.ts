import type { MapPoiCategory, MapZoneType } from '../../types/map';

export { defaultZoneStyles } from '../../data/festivalMap';
export type { MapPoiCategory, MapZoneType };

export const ZONE_TYPE_LABELS: Record<MapZoneType, string> = {
  building: 'Здание',
  camping: 'Кемпинг',
  parking: 'Парковка',
  autocamp: 'Автокемпинг',
  comfort: 'Комфорт',
  trade: 'Торговля',
  stage_area: 'Сцена',
  service: 'Сервис',
  toilet: 'Туалет',
  shower: 'Душ',
  water: 'Вода',
  fence: 'Ограждение',
  custom: 'Другое',
};

/** Zone types shown as filter tabs (exclude background layers). */
export const ZONE_TAB_EXCLUDE: MapZoneType[] = ['fence'];

export const ZONE_TYPE_ORDER: MapZoneType[] = [
  'toilet',
  'shower',
  'water',
  'service',
  'comfort',
  'trade',
  'stage_area',
  'camping',
  'parking',
  'autocamp',
  'building',
  'custom',
  'fence',
];

function readZoneType(
  feature: GeoJSON.Feature<GeoJSON.Polygon, import('../../types/map').MapZoneProperties>,
): MapZoneType | null {
  const raw = feature.properties?.zoneType;
  if (typeof raw !== 'string') return null;
  return ZONE_TYPE_ORDER.includes(raw as MapZoneType) ? (raw as MapZoneType) : null;
}

export function getActiveZoneTypes(
  features: GeoJSON.Feature<GeoJSON.Polygon, import('../../types/map').MapZoneProperties>[],
): MapZoneType[] {
  const present = new Set<MapZoneType>();
  for (const feature of features) {
    const zoneType = readZoneType(feature);
    if (zoneType) present.add(zoneType);
  }
  return ZONE_TYPE_ORDER.filter(
    (zoneType) => present.has(zoneType) && !ZONE_TAB_EXCLUDE.includes(zoneType),
  );
}

export function filterZoneFeatures(
  features: GeoJSON.Feature<GeoJSON.Polygon, import('../../types/map').MapZoneProperties>[],
  filter: import('../../types/map').MapFilterId,
) {
  if (filter === 'all') return features;
  return features.filter(
    (f) => f.properties.zoneType === filter || f.properties.zoneType === 'fence',
  );
}

export function getZoneIconName(
  zoneType: MapZoneType,
): 'business' | 'leaf' | 'car' | 'bed' | 'star' | 'storefront' | 'musical-notes' | 'construct' | 'man' | 'rainy' | 'water' | 'git-branch' | 'location' {
  switch (zoneType) {
    case 'building':
      return 'business';
    case 'camping':
      return 'leaf';
    case 'parking':
    case 'autocamp':
      return 'car';
    case 'comfort':
      return 'bed';
    case 'trade':
      return 'storefront';
    case 'stage_area':
      return 'musical-notes';
    case 'service':
      return 'construct';
    case 'toilet':
      return 'man';
    case 'shower':
      return 'rainy';
    case 'water':
      return 'water';
    case 'fence':
      return 'git-branch';
    default:
      return 'location';
  }
}

export const POI_CATEGORY_LABELS: Record<MapPoiCategory, string> = {
  stage: 'Сцена',
  foodcourt: 'Фудкорт',
  toilet: 'Туалеты',
  shower: 'Душ',
  water: 'Вода',
  medical: 'Медпункт',
  info: 'Инфо',
  entrance: 'Въезд',
  parking: 'Парковка',
  custom: 'Другое',
};

/** Stable tab order for POI category filters. */
export const POI_CATEGORY_ORDER: import('../../types/map').MapPoiCategory[] = [
  'stage',
  'foodcourt',
  'toilet',
  'shower',
  'water',
  'medical',
  'info',
  'entrance',
  'parking',
  'custom',
];

function readPoiCategory(
  feature: GeoJSON.Feature<GeoJSON.Point, import('../../types/map').MapPoiProperties>,
): MapPoiCategory | null {
  const raw = feature.properties?.category;
  if (typeof raw !== 'string') return null;
  return POI_CATEGORY_ORDER.includes(raw as MapPoiCategory) ? (raw as MapPoiCategory) : null;
}

export function getActivePoiCategories(
  features: GeoJSON.Feature<GeoJSON.Point, import('../../types/map').MapPoiProperties>[],
): MapPoiCategory[] {
  const present = new Set<MapPoiCategory>();
  for (const feature of features) {
    const category = readPoiCategory(feature);
    if (category) present.add(category);
  }
  return POI_CATEGORY_ORDER.filter((category) => present.has(category));
}

export function getPoiIconName(
  category: string,
): 'musical-notes' | 'restaurant' | 'water' | 'medkit' | 'information-circle' | 'enter' | 'car' | 'man' | 'rainy' | 'location' {
  switch (category) {
    case 'stage':
      return 'musical-notes';
    case 'foodcourt':
      return 'restaurant';
    case 'water':
      return 'water';
    case 'medical':
      return 'medkit';
    case 'info':
      return 'information-circle';
    case 'entrance':
      return 'enter';
    case 'parking':
      return 'car';
    case 'toilet':
      return 'man';
    case 'shower':
      return 'rainy';
    default:
      return 'location';
  }
}

export function filterPoiFeatures(
  features: GeoJSON.Feature<GeoJSON.Point, import('../../types/map').MapPoiProperties>[],
  _filter: import('../../types/map').MapFilterId,
) {
  return features;
}

export const MAP_CAMERA_2D = { pitch: 0, bearing: 0 };
export const MAP_CAMERA_3D = { pitch: 55, bearing: 0 };
