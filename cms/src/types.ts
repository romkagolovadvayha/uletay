import type { HeadlinerLastFmProfile } from '@/lastfm-types';

export type StageId = 'ren-tv' | 'south' | 'west';

export interface Stage {
  id: StageId;
  name: string;
  shortName: string;
  color?: string;
}

export interface SchedulePerformance {
  id: string;
  stageId: StageId;
  date: string;
  startTime: string;
  endTime: string;
  headlinerId: string;
  artist: string;
  isCompetition?: boolean;
  imageUrl?: string;
}

export interface AutographSession {
  id: string;
  stageId: StageId;
  date: string;
  startTime: string;
  endTime: string;
  headlinerId: string;
  artist: string;
  location?: string;
  imageUrl?: string;
}

export type FoodCourtCategory = 'hot' | 'drinks' | 'desserts';

export interface FoodCourtMenuItem {
  name: string;
  price: string;
  portion?: string;
  description?: string;
}

export interface FoodCourtMenuSection {
  title: string;
  items: FoodCourtMenuItem[];
}

export interface FoodCourtVendor {
  id: string;
  name: string;
  category: FoodCourtCategory;
  description: string;
  location: string;
  hours: string;
  priceFrom: string;
  priceRange?: string;
  distance: string;
  imageTint: string;
  imageUrl?: string;
  legalName?: string;
  contacts?: string;
  notes?: string;
  menu?: FoodCourtMenuSection[];
  menuImageUrls?: string[];
}

export type {
  HeadlinerLastFmImage,
  HeadlinerLastFmProfile,
  HeadlinerLastFmSimilarArtist,
  HeadlinerLastFmTag,
  HeadlinerLastFmTrack,
} from '@/lastfm-types';

export interface Headliner {
  id: string;
  name: string;
  description: string;
  imageTint: string;
  imageUrl?: string;
  years: number[];
  alternateNames?: string[];
  linkedHeadlinerIds?: string[];
  lastfm?: HeadlinerLastFmProfile;
}

export interface FestivalInfo {
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  location: string;
  locationShort: string;
  ageRating: string;
  heroImageUrl?: string;
  logoImageUrl?: string;
}

export interface FestivalRulesLink {
  label: string;
  url: string;
}

export interface FestivalRulesBlock {
  title?: string;
  paragraphs?: string[];
  items?: string[];
  important?: boolean;
  link?: FestivalRulesLink;
}

export interface FestivalRulesTab {
  id: string;
  label: string;
  blocks: FestivalRulesBlock[];
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapAdminOverlay {
  imageUrl: string;
  opacity?: number;
  /** Центр схемы на карте */
  center: LatLng;
  /** Ширина схемы в метрах (масштаб) */
  widthMeters: number;
  /** Высота / ширина (из пропорций PNG) */
  aspectRatio?: number;
  /** Поворот по часовой, градусы */
  rotation?: number;
}

export interface FestivalMapConfig {
  center: LatLng;
  defaultZoom: number;
  enabled: boolean;
  territoryBounds?: { sw: LatLng; ne: LatLng };
  adminOverlay?: MapAdminOverlay;
}

export type MapZoneType =
  | 'building'
  | 'camping'
  | 'parking'
  | 'autocamp'
  | 'comfort'
  | 'trade'
  | 'stage_area'
  | 'service'
  | 'toilet'
  | 'shower'
  | 'water'
  | 'fence'
  | 'custom';

export interface MapZoneProperties {
  id: string;
  name: string;
  zoneType: MapZoneType;
  fillColor: string;
  fillOpacity: number;
  strokeColor?: string;
  strokeWidth?: number;
  description?: string;
  extrusionHeight?: number;
  /** Подпись на карте (по умолчанию — для зданий и сервисных объектов) */
  showLabel?: boolean;
  /** Фоновое изображение внутри полигона */
  fillImageUrl?: string;
  fillImageOpacity?: number;
  /** Поворот фона внутри полигона (°), по умолчанию как у формы */
  fillImageRotation?: number;
  /** Поворот подписи внутри полигона (°), по умолчанию как у формы */
  labelRotation?: number;
  /** Прямоугольная раскладка — для редактора (W/H/угол) */
  layout?: {
    center: LatLng;
    widthMeters: number;
    heightMeters: number;
    rotation: number;
  };
}

export type MapPathProperties = {
  id: string;
  name?: string;
  pathKind?: 'road' | 'walkway' | 'fence';
};

export type MapPoiCategory =
  | 'stage'
  | 'foodcourt'
  | 'toilet'
  | 'shower'
  | 'water'
  | 'medical'
  | 'info'
  | 'entrance'
  | 'parking'
  | 'custom';

export interface MapPoiLink {
  type: 'stage' | 'foodcourt' | 'none';
  id?: string;
}

export interface MapPoiProperties {
  id: string;
  name: string;
  category: MapPoiCategory;
  description?: string;
  link?: MapPoiLink;
}

export type MapPathsGeoJson = GeoJSON.FeatureCollection<
  GeoJSON.LineString,
  MapPathProperties
>;

export type MapZonesGeoJson = GeoJSON.FeatureCollection<
  GeoJSON.Polygon,
  MapZoneProperties
>;

export type MapPoisGeoJson = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  MapPoiProperties
>;

export interface AppData {
  festival: FestivalInfo;
  stages: Stage[];
  schedule: SchedulePerformance[];
  autographs: AutographSession[];
  foodcourt: FoodCourtVendor[];
  headliners: Headliner[];
  rules: FestivalRulesTab[];
  festivalMap?: FestivalMapConfig;
  mapZones?: MapZonesGeoJson;
  mapPaths?: MapPathsGeoJson;
  mapPois?: MapPoisGeoJson;
}

export type AdminTab =
  | 'festival'
  | 'stages'
  | 'schedule'
  | 'autographs'
  | 'headliners'
  | 'foodcourt'
  | 'map'
  | 'push';
