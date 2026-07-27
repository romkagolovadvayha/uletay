import {
  AppData,
  AutographSession,
  Headliner,
  SchedulePerformance,
  Stage,
  StageId,
} from '../types';
import { capPerformanceEndTime } from './performanceTime';
import {
  buildDemoFestivalNow,
  remapFestivalDate,
  resolveDemoFestivalWindow,
} from './demoTime';
import { getFestivalDates } from './scheduleHelpers';

const AUTOGRAPH_LOCATION = 'ПАЛАТОЧНЫЙ ГОРОДОК';
const STAGE_IDS: StageId[] = ['ren-tv', 'south', 'west'];
const SET_DURATIONS = [45, 50, 55, 60];
const DAY_START_MINUTES = 15 * 60;
const DAY_END_MINUTES = 23 * 60;

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function minutesToTime(total: number): string {
  const normalized = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function pickHeadliners(headliners: Headliner[], rng: () => number): Headliner[] {
  if (headliners.length === 0) {
    return Array.from({ length: 24 }, (_, index) => ({
      id: `demo-hl-${index + 1}`,
      name: `ДЕМО АРТИСТ ${index + 1}`,
      description: '',
      imageTint: '#FFC107',
      years: [],
    }));
  }

  const pool = [...headliners];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function generateDemoSchedule(
  dates: string[],
  stages: Stage[],
  headliners: Headliner[],
  seedKey: string,
): SchedulePerformance[] {
  const rng = createRng(hashSeed(`schedule:${seedKey}`));
  const pool = pickHeadliners(headliners, rng);
  const stageIds = (stages.length ? stages.map((stage) => stage.id) : STAGE_IDS) as StageId[];
  const performances: SchedulePerformance[] = [];
  let cursor = 0;

  for (const date of dates) {
    for (const stageId of stageIds) {
      let minute = DAY_START_MINUTES + Math.floor(rng() * 20);
      while (minute < DAY_END_MINUTES - 40) {
        const headliner = pool[cursor % pool.length];
        cursor += 1;
        const duration = SET_DURATIONS[Math.floor(rng() * SET_DURATIONS.length)];
        const startTime = minutesToTime(minute);
        const endTime = capPerformanceEndTime(startTime, minutesToTime(minute + duration));
        performances.push({
          id: `demo-${stageId}-${date}-${startTime}-${headliner.id}`,
          stageId,
          date,
          startTime,
          endTime,
          headlinerId: headliner.id,
          artist: headliner.name,
          imageUrl: headliner.imageUrl,
        });
        minute += duration + 5 + Math.floor(rng() * 10);
      }
    }
  }

  return performances;
}

function generateDemoAutographs(
  dates: string[],
  schedule: SchedulePerformance[],
  headliners: Headliner[],
  seedKey: string,
): AutographSession[] {
  const rng = createRng(hashSeed(`autographs:${seedKey}`));
  const fallbackPool = pickHeadliners(headliners, rng);
  const byDate = new Map<string, SchedulePerformance[]>();
  for (const item of schedule) {
    const list = byDate.get(item.date) ?? [];
    list.push(item);
    byDate.set(item.date, list);
  }

  const sessions: AutographSession[] = [];

  for (const date of dates) {
    const unique = new Map<string, SchedulePerformance>();
    for (const item of byDate.get(date) ?? []) {
      if (!unique.has(item.headlinerId)) {
        unique.set(item.headlinerId, item);
      }
    }

    const candidates = [...unique.values()];
    for (let i = candidates.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    const count = Math.min(4 + Math.floor(rng() * 4), Math.max(candidates.length, 6));
    let minute = 16 * 60 + Math.floor(rng() * 40);

    for (let i = 0; i < count; i += 1) {
      const fromSchedule = candidates[i];
      const fallback = fallbackPool[i % fallbackPool.length];
      const stageId = fromSchedule?.stageId ?? STAGE_IDS[i % STAGE_IDS.length];
      const headlinerId = fromSchedule?.headlinerId ?? fallback.id;
      const artist = fromSchedule?.artist ?? fallback.name;
      const imageUrl = fromSchedule?.imageUrl ?? fallback.imageUrl;
      const startTime = minutesToTime(minute);
      const endTime = minutesToTime(minute + 30);

      sessions.push({
        id: `demo-auto-${date}-${startTime}-${headlinerId}`,
        stageId,
        date,
        startTime,
        endTime,
        headlinerId,
        artist,
        location: AUTOGRAPH_LOCATION,
        imageUrl,
      });

      minute += 35 + Math.floor(rng() * 25);
      if (minute > 21 * 60) {
        break;
      }
    }
  }

  return sessions;
}

function remapDatedItems<T extends { id: string; date: string }>(
  items: T[],
  fromStart: string,
  toStart: string,
  toEnd: string,
): T[] {
  return items.map((item) => {
    const date = remapFestivalDate(item.date, fromStart, toStart, toEnd);
    return {
      ...item,
      date,
      id: item.id.includes(item.date) ? item.id.replace(item.date, date) : item.id,
    };
  });
}

/** Демо-оверлей: окно фестиваля + расписание/автографы при отсутствии реальных данных */
export function buildDemoAppData(data: AppData, realNow = new Date()): AppData {
  const window = resolveDemoFestivalWindow(data.festival, realNow);
  const dates = getFestivalDates(window.startDate, window.endDate);
  const seedKey = `${window.startDate}:${window.endDate}`;

  const schedule =
    data.schedule.length > 0
      ? remapDatedItems(data.schedule, data.festival.startDate, window.startDate, window.endDate)
      : generateDemoSchedule(dates, data.stages, data.headliners, seedKey);

  const autographs =
    data.autographs.length > 0
      ? remapDatedItems(data.autographs, data.festival.startDate, window.startDate, window.endDate)
      : generateDemoAutographs(dates, schedule, data.headliners, seedKey);

  return {
    ...data,
    festival: {
      ...data.festival,
      startDate: window.startDate,
      endDate: window.endDate,
      year: window.year,
    },
    schedule,
    autographs,
  };
}

export function getDemoNowFromData(data: AppData, realNow = new Date()): Date {
  const window = resolveDemoFestivalWindow(data.festival, realNow);
  return buildDemoFestivalNow(window.startDate, window.endDate);
}
