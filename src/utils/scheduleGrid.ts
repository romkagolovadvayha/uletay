import { SchedulePerformance, StageId } from '../types';
import { toFestivalDayTimelineMinutes } from './festivalTime';
import { getPerformanceDurationMinutes } from './performanceTime';
import { sortByStartTime } from './scheduleHelpers';

export const SCHEDULE_GRID_BASE_PIXELS_PER_MINUTE = 1;
/** @deprecated Use getScheduleGridPixelsPerMinute() for day-specific scale. */
export const SCHEDULE_GRID_PIXELS_PER_MINUTE = SCHEDULE_GRID_BASE_PIXELS_PER_MINUTE;
export const SCHEDULE_GRID_MIN_CARD_HEIGHT = 44;
export const SCHEDULE_GRID_CARD_GAP = 3;
export const SCHEDULE_GRID_CARD_TOP_OFFSET = 6;
export const SCHEDULE_GRID_TIME_AXIS_WIDTH = 44;
export const SCHEDULE_GRID_COLUMN_GAP = 6;
export const SCHEDULE_GRID_HOUR_STEP = 60;
export const SCHEDULE_GRID_DAY_PADDING_MINUTES = 15;

export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes ?? 0);
}

export function formatMinutesAsClock(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function getPerformanceEndMinutes(performance: SchedulePerformance): number {
  const start = parseTimeToMinutes(performance.startTime);
  return start + getPerformanceDurationMinutes(performance.startTime, performance.endTime);
}

export function getDayScheduleBounds(
  performances: SchedulePerformance[],
  festivalDay: string,
): { start: number; end: number } {
  if (performances.length === 0) {
    return { start: 0, end: 12 * 60 };
  }

  let start = Number.POSITIVE_INFINITY;
  let end = 0;

  for (const performance of performances) {
    const timelineStart = toFestivalDayTimelineMinutes(
      performance.date,
      performance.startTime,
      festivalDay,
    );
    if (timelineStart === null) {
      continue;
    }

    const timelineEnd = timelineStart + getPerformanceDurationMinutes(performance.startTime, performance.endTime);
    start = Math.min(start, timelineStart);
    end = Math.max(end, timelineEnd);
  }

  const padding = SCHEDULE_GRID_DAY_PADDING_MINUTES;
  return {
    start: Math.max(0, Math.floor(start / SCHEDULE_GRID_HOUR_STEP) * SCHEDULE_GRID_HOUR_STEP - padding),
    end: Math.min(24 * 60, Math.ceil(end / SCHEDULE_GRID_HOUR_STEP) * SCHEDULE_GRID_HOUR_STEP + padding),
  };
}

export function getHourMarkers(dayStart: number, dayEnd: number): number[] {
  const markers: number[] = [];
  const firstHour = Math.ceil(dayStart / SCHEDULE_GRID_HOUR_STEP) * SCHEDULE_GRID_HOUR_STEP;

  for (let minute = firstHour; minute <= dayEnd; minute += SCHEDULE_GRID_HOUR_STEP) {
    markers.push(minute);
  }

  return markers;
}

export function groupPerformancesByStage(
  performances: SchedulePerformance[],
): Partial<Record<StageId, SchedulePerformance[]>> {
  const grouped = performances.reduce<Partial<Record<StageId, SchedulePerformance[]>>>((acc, performance) => {
    if (!acc[performance.stageId]) {
      acc[performance.stageId] = [];
    }
    acc[performance.stageId]!.push(performance);
    return acc;
  }, {});

  for (const stageId of Object.keys(grouped) as StageId[]) {
    grouped[stageId] = sortByStartTime(grouped[stageId]!);
  }

  return grouped;
}

export type ScheduleGridCardLayout = {
  performance: SchedulePerformance;
  top: number;
  height: number;
};

export function getScheduleGridPixelsPerMinute(performances: SchedulePerformance[]): number {
  if (performances.length === 0) {
    return SCHEDULE_GRID_BASE_PIXELS_PER_MINUTE;
  }

  const minSlotHeight = SCHEDULE_GRID_MIN_CARD_HEIGHT + SCHEDULE_GRID_CARD_GAP;
  let minDuration = Number.POSITIVE_INFINITY;

  for (const performance of performances) {
    minDuration = Math.min(
      minDuration,
      getPerformanceDurationMinutes(performance.startTime, performance.endTime),
    );
  }

  if (!Number.isFinite(minDuration) || minDuration <= 0) {
    return SCHEDULE_GRID_BASE_PIXELS_PER_MINUTE;
  }

  const required = minSlotHeight / minDuration;
  return Math.max(SCHEDULE_GRID_BASE_PIXELS_PER_MINUTE, Math.ceil(required));
}

function resolveCardLayoutOverlaps(cards: ScheduleGridCardLayout[]): ScheduleGridCardLayout[] {
  if (cards.length <= 1) {
    return cards;
  }

  const sorted = [...cards].sort((a, b) => a.top - b.top);
  const resolved: ScheduleGridCardLayout[] = [sorted[0]!];

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = resolved[resolved.length - 1]!;
    const current = { ...sorted[index]! };
    const minTop = previous.top + previous.height + SCHEDULE_GRID_CARD_GAP;

    if (current.top < minTop) {
      current.top = minTop;
    }

    resolved.push(current);
  }

  return resolved;
}

export function layoutPerformanceCards(
  performances: SchedulePerformance[],
  festivalDay: string,
  timelineStart: number,
  pixelsPerMinute: number = SCHEDULE_GRID_BASE_PIXELS_PER_MINUTE,
): ScheduleGridCardLayout[] {
  const layouts = performances.map((performance) => {
    const start = toFestivalDayTimelineMinutes(performance.date, performance.startTime, festivalDay) ?? 0;
    const duration = getPerformanceDurationMinutes(performance.startTime, performance.endTime);
    const rawHeight = duration * pixelsPerMinute;
    const height = Math.max(rawHeight - SCHEDULE_GRID_CARD_GAP, SCHEDULE_GRID_MIN_CARD_HEIGHT);

    return {
      performance,
      top: (start - timelineStart) * pixelsPerMinute + SCHEDULE_GRID_CARD_TOP_OFFSET,
      height,
    };
  });

  return resolveCardLayoutOverlaps(layouts);
}

export function minutesToGridOffset(
  minutes: number,
  dayStart: number,
  pixelsPerMinute: number = SCHEDULE_GRID_BASE_PIXELS_PER_MINUTE,
): number {
  return (minutes - dayStart) * pixelsPerMinute;
}
