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
  const zoneTypes = POI_CATEGORY_ORDER.includes(filter as MapPoiCategory)
    ? poiCategoryToZoneTypes(filter as MapPoiCategory)
    : [filter as MapZoneType];
  return features.filter((f) => {
    if (f.properties.zoneType === 'fence') return true;
    if (['medical', 'security', 'info'].includes(filter)) {
      if (f.properties.zoneType !== 'service') return false;
      const medical = /мед|скорая|перв\S* помощ/i.test(f.properties.name);
      const security = /охран|полици|безопас|мчс/i.test(f.properties.name);
      return filter === 'medical' ? medical : filter === 'security' ? security : !medical && !security;
    }
    return zoneTypes.includes(f.properties.zoneType);
  });
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
  stage: 'Сцены',
  foodcourt: 'Фудкорт',
  toilet: 'Туалеты',
  shower: 'Душ',
  water: 'Вода',
  medical: 'Медпункт',
  security: 'Охрана',
  info: 'Инфо',
  entrance: 'Входы',
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
  'security',
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
): 'musical-notes' | 'restaurant' | 'water' | 'medkit' | 'shield-checkmark' | 'information-circle' | 'enter' | 'car' | 'man' | 'rainy' | 'location' {
  switch (category) {
    case 'stage':
      return 'musical-notes';
    case 'foodcourt':
      return 'restaurant';
    case 'water':
      return 'water';
    case 'medical':
      return 'medkit';
    case 'security':
      return 'shield-checkmark';
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
  filter: import('../../types/map').MapFilterId,
) {
  if (filter === 'all') return features;
  const categories = zoneTypeToPoiCategories(filter);
  return features.filter((feature) => categories.includes(feature.properties.category));
}

function zoneTypeToPoiCategories(
  filter: import('../../types/map').MapFilterId,
): MapPoiCategory[] {
  if (POI_CATEGORY_ORDER.includes(filter as MapPoiCategory)) {
    return [filter as MapPoiCategory];
  }
  switch (filter) {
    case 'stage_area':
      return ['stage'];
    case 'trade':
      return ['foodcourt'];
    case 'toilet':
      return ['toilet'];
    case 'shower':
      return ['shower'];
    case 'water':
      return ['water'];
    case 'parking':
    case 'autocamp':
      return ['parking'];
    case 'service':
      return ['medical', 'security', 'info'];
    default:
      return [];
  }
}

function poiCategoryToZoneTypes(category: MapPoiCategory): MapZoneType[] {
  switch (category) {
    case 'stage':
      return ['stage_area'];
    case 'foodcourt':
      return ['trade'];
    case 'toilet':
      return ['toilet'];
    case 'shower':
      return ['shower'];
    case 'water':
      return ['water'];
    case 'medical':
    case 'security':
    case 'info':
      return ['service'];
    case 'parking':
      return ['parking'];
    case 'custom':
      return ['building', 'custom', 'camping', 'comfort'];
    default:
      return [];
  }
}

export const MAP_CAMERA_2D = { pitch: 0, bearing: 0 };
export const MAP_CAMERA_3D = { pitch: 55, bearing: 0 };

/** A single source for the chips and screen's filter validation. */
export function getMapFilters(
  zones: import('../../types/map').MapZonesGeoJson | undefined,
  pois: import('../../types/map').MapPoisGeoJson | undefined,
): { id: import('../../types/map').MapFilterId; label: string }[] {
  const categories = getActivePoiCategories(pois?.features ?? []);
  const zoneTypes = getActiveZoneTypes(zones?.features ?? []);
  const covered = new Set(categories.filter(c => c !== 'custom').flatMap(poiCategoryToZoneTypes));
  const filters: { id: import('../../types/map').MapFilterId; label: string }[] = [
    { id: 'all', label: 'Всё' },
    ...categories.filter(c => c !== 'custom').map(id => ({ id, label: POI_CATEGORY_LABELS[id] })),
    ...zoneTypes.filter(t => !covered.has(t)).map(id => ({ id, label: ZONE_TYPE_LABELS[id] })),
    ...(!zoneTypes.includes('custom') && categories.includes('custom') ? [{ id: 'custom' as const, label: 'Другое' }] : []),
  ];
  const priority: string[] = ['all', 'autocamp', 'parking', 'stage', 'camping', 'entrance'];
  return filters.sort((a, b) => {
    const aIndex = priority.indexOf(a.id), bIndex = priority.indexOf(b.id);
    return (aIndex < 0 ? priority.length : aIndex) - (bIndex < 0 ? priority.length : bIndex);
  });
}
