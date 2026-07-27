import {
  AppData,
  AutographSession,
  Headliner,
  SchedulePerformance,
  Stage,
  StageId,
} from '../types';
import { favoriteKey } from './favoriteKeys';
import { capPerformanceEndTime } from './performanceTime';
import {
  buildDemoFestivalNow,
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
    return Array.from({ length: 36 }, (_, index) => ({
      id: `demo-hl-${index + 1}`,
      name: `ДЕМО АРТИСТ ${index + 1}`,
      description: 'Демо-карточка артиста для предварительного просмотра фестиваля.',
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
          isCompetition: rng() > 0.92,
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

    const count = Math.min(5 + Math.floor(rng() * 4), Math.max(candidates.length, 8));
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

function mergeDemoHeadliners(
  existing: Headliner[],
  schedule: SchedulePerformance[],
  autographs: AutographSession[],
): Headliner[] {
  const byId = new Map(existing.map((item) => [item.id, item]));
  const ensure = (id: string, name: string, imageUrl?: string) => {
    if (byId.has(id)) {
      return;
    }
    byId.set(id, {
      id,
      name,
      description: 'Демо-карточка артиста для предварительного просмотра фестиваля.',
      imageTint: '#FFC107',
      imageUrl,
      years: [],
    });
  };

  for (const item of schedule) {
    ensure(item.headlinerId, item.artist, item.imageUrl);
  }
  for (const item of autographs) {
    ensure(item.headlinerId, item.artist, item.imageUrl);
  }

  return [...byId.values()];
}

/** Стабильный набор избранного для демо-режима (не пишется в AsyncStorage). */
export function buildDemoFavoriteKeys(
  schedule: SchedulePerformance[],
  autographs: AutographSession[],
  seedKey: string,
): string[] {
  const rng = createRng(hashSeed(`favorites:${seedKey}`));
  const midDate =
    schedule.map((item) => item.date).sort()[Math.floor(schedule.length / 2)] ?? schedule[0]?.date;

  const dayPerformances = schedule.filter((item) => item.date === midDate);
  const dayAutographs = autographs.filter((item) => item.date === midDate);

  const pick = <T,>(items: T[], count: number): T[] => {
    const pool = [...items];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, Math.min(count, pool.length));
  };

  return [
    ...pick(dayPerformances, 6).map((item) => favoriteKey('performance', item.id)),
    ...pick(dayAutographs, 4).map((item) => favoriteKey('autograph', item.id)),
  ];
}

/** Демо-оверлей: следующее окно фестиваля + всегда фейковое расписание и автографы */
export function buildDemoAppData(data: AppData, realNow = new Date()): AppData {
  const window = resolveDemoFestivalWindow(data.festival, realNow);
  const dates = getFestivalDates(window.startDate, window.endDate);
  const seedKey = `${window.startDate}:${window.endDate}`;

  const schedule = generateDemoSchedule(dates, data.stages, data.headliners, seedKey);
  const autographs = generateDemoAutographs(dates, schedule, data.headliners, seedKey);
  const headliners = mergeDemoHeadliners(data.headliners, schedule, autographs);

  return {
    ...data,
    festival: {
      ...data.festival,
      startDate: window.startDate,
      endDate: window.endDate,
      year: window.year,
    },
    headliners,
    schedule,
    autographs,
  };
}

export function getDemoNowFromData(data: AppData, realNow = new Date()): Date {
  const window = resolveDemoFestivalWindow(data.festival, realNow);
  return buildDemoFestivalNow(window.startDate, window.endDate);
}
