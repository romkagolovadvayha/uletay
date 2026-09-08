import { AppData, FestivalInfo, Stage } from '../types';
import { festivalRules } from '../data/festivalRules';
import { TICKET_VENDOR_URL } from '../constants/legal';
import { capPerformanceEndTime } from './performanceTime';
import { getDefaultMapData } from '../data/festivalMapSeed';
import { syncAppHeadliners } from './headlinersCore';
import { withOperationalPois } from './map/poiData';
import { stageColors } from '../theme/palettes';

export const defaultStageColors: Record<Stage['id'], string> = stageColors;

export function withDefaultStages(stages: Stage[]): Stage[] {
  return stages.map((stage) => ({
    ...stage,
    color: stage.color ?? defaultStageColors[stage.id],
  }));
}

export function normalizeAppData(data: AppData): AppData {
  const mapDefaults = getDefaultMapData();
  const mapZones = data.mapZones ?? mapDefaults.mapZones;
  const mapPois = withOperationalPois(mapZones, data.mapPois ?? mapDefaults.mapPois);
  const base: AppData = {
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
    headliners: Array.isArray(data.headliners) ? data.headliners : [],
    rules: (Array.isArray(data.rules) && data.rules.length ? data.rules : festivalRules).map(
      (tab) => ({
        ...tab,
        blocks: tab.blocks.map((block) =>
          // Cached and CMS rules may still point to a previous festival's tickets.
          block.link && /^https?:\/\/(?:www\.)?drivegrup\.ru\/ticket\/ylet\d*\/?(?:[?#].*)?$/i.test(block.link.url)
            ? { ...block, link: { ...block.link, url: TICKET_VENDOR_URL } }
            : block,
        ),
      }),
    ),
    festivalMap: data.festivalMap ?? mapDefaults.festivalMap,
    mapZones,
    mapPaths: data.mapPaths ?? mapDefaults.mapPaths,
    mapPois,
  };

  return syncAppHeadliners({
    ...base,
    headliners: base.headliners.map((item) => ({
      ...item,
      imageUrl: item.imageUrl ?? undefined,
      years: Array.isArray(item.years) ? item.years : [],
      alternateNames: item.alternateNames?.filter(Boolean),
      linkedHeadlinerIds: item.linkedHeadlinerIds?.filter(Boolean),
      lastfm: item.lastfm,
    })),
  });
}

export function mergeFestivalDefaults(festival: FestivalInfo, fallback: FestivalInfo): FestivalInfo {
  return { ...fallback, ...festival };
}
