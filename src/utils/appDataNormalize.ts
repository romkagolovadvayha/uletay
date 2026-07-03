import { AppData, FestivalInfo, Stage } from '../types';
import { capPerformanceEndTime } from './performanceTime';

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
    })),
  };
}

export function mergeFestivalDefaults(festival: FestivalInfo, fallback: FestivalInfo): FestivalInfo {
  return { ...fallback, ...festival };
}
