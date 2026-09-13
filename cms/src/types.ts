import type {
  FestivalMapConfig,
  MapPathsGeoJson,
  MapZonesGeoJson,
  MapPoisGeoJson,
} from '../../src/types/map';
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

// One map contract for the CMS, web and native app.
export type {
  LatLng,
  MapAdminOverlay,
  FestivalMapConfig,
  MapZoneType,
  MapZoneProperties,
  MapPathProperties,
  MapPoiCategory,
  MapPoiLink,
  MapPoiProperties,
  MapPathsGeoJson,
  MapZonesGeoJson,
  MapPoisGeoJson,
} from '../../src/types/map';

export interface AppData {
  /** Opaque version of the stored content; required when saving a snapshot. */
  revision?: string;
  mapDataVersion?: string;
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
  | 'overview'
  | 'festival'
  | 'stages'
  | 'schedule'
  | 'autographs'
  | 'headliners'
  | 'foodcourt'
  | 'map'
  | 'push';
