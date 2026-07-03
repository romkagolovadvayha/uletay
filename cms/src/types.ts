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
  artist: string;
  location?: string;
  imageUrl?: string;
}

export type FoodCourtCategory = 'hot' | 'drinks' | 'desserts';

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

export interface AppData {
  festival: FestivalInfo;
  stages: Stage[];
  schedule: SchedulePerformance[];
  autographs: AutographSession[];
  foodcourt: FoodCourtVendor[];
}

export type AdminTab = 'festival' | 'stages' | 'schedule' | 'autographs' | 'foodcourt';
