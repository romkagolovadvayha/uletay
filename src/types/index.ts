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
  /** Denormalized display name synced from headliner. */
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
  /** Denormalized display name synced from headliner. */
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

export interface Headliner {
  id: string;
  name: string;
  description: string;
  imageTint: string;
  imageUrl?: string;
  years: number[];
  /** Дополнительные названия для поиска в Last.fm */
  alternateNames?: string[];
  /** Связанные карточки хэдлайнеров (то же выступление под другим именем) */
  linkedHeadlinerIds?: string[];
  lastfm?: import('./lastfm').HeadlinerLastFmProfile;
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

export type {
  CombinedRoute,
  FestivalMapConfig,
  LatLng,
  MapFilterId,
  MapPathsGeoJson,
  MapPoiCategory,
  MapPoiLink,
  MapPoiProperties,
  MapPoisGeoJson,
  MapViewMode,
  MapZoneProperties,
  MapZoneType,
  MapZonesGeoJson,
  RouteSegment,
  RouteSegmentKind,
  UserLocationState,
} from './map';

export interface AppData {
  revision?: string;
  mapDataVersion?: string;
  festival: FestivalInfo;
  stages: Stage[];
  schedule: SchedulePerformance[];
  autographs: AutographSession[];
  foodcourt: FoodCourtVendor[];
  headliners: Headliner[];
  rules: FestivalRulesTab[];
  festivalMap?: import('./map').FestivalMapConfig;
  mapZones?: import('./map').MapZonesGeoJson;
  mapPaths?: import('./map').MapPathsGeoJson;
  mapPois?: import('./map').MapPoisGeoJson;
}
