import { AppData, FestivalInfo, Stage } from '../types';
import { capPerformanceEndTime } from './performanceTime';
import { festivalRules } from '../data/festivalRules';
import { headliners as defaultHeadliners } from '../data/headliners';
import { getDefaultMapData } from '../data/festivalMap';

export const defaultStageColors: Record<Stage['id'], string> = {
  south: '#F5C518',
  west: '#34C759',
  'ren-tv': '#FF5520',
};

export function withDefaultStages(stages: Stage[]): Stage[] {
  return stages.map((stage) => ({
    ...stage,
    color: stage.color ?? defaultStageColors[stage.id],
  }));
}

export function normalizeAppData(data: AppData): AppData {
  const mapDefaults = getDefaultMapData();
  return {
    ...data,
    festival: {
      ...data.festival,
      heroImageUrl: data.festival.heroImageUrl ?? undefined,
      logoImageUrl: data.festival.logoImageUrl ?? undefined,
    },
    stages: withDefaultStages(data.stages),
    schedule: data.schedule.map((item) => ({
      ...item,
      endTime: capPerformanceEndTime(item.startTime, item.endTime),
      imageUrl: item.imageUrl ?? undefined,
    })),
    autographs: data.autographs.map((item) => ({
      ...item,
      imageUrl: item.imageUrl ?? undefined,
    })),
    foodcourt: data.foodcourt.map((item) => ({
      ...item,
      imageUrl: item.imageUrl ?? undefined,
      menuImageUrls: item.menuImageUrls?.length ? item.menuImageUrls : undefined,
      menu: item.menu?.length ? item.menu : undefined,
    })),
    headliners: (Array.isArray(data.headliners) && data.headliners.length ? data.headliners : defaultHeadliners).map(
      (item) => ({
        ...item,
        imageUrl: item.imageUrl ?? undefined,
      }),
    ),
    rules: Array.isArray(data.rules) && data.rules.length ? data.rules : festivalRules,
    festivalMap: data.festivalMap ?? mapDefaults.festivalMap,
    mapZones: data.mapZones ?? mapDefaults.mapZones,
    mapPaths: data.mapPaths ?? mapDefaults.mapPaths,
    mapPois: data.mapPois ?? mapDefaults.mapPois,
  };
}

export function mergeFestivalDefaults(festival: FestivalInfo, fallback: FestivalInfo): FestivalInfo {
  return { ...fallback, ...festival };
}
