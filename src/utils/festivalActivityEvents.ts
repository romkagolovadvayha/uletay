import type { AppData } from '../types';
import { addDaysToDateString, parseFestivalLocalDateTime } from './festivalTime';

export const ACTIVITY_LEAD_MS = 10 * 60 * 1000;

export type FestivalActivityEvent = {
  id: string;
  artist: string;
  stage: string;
  kind: 'performance' | 'autograph';
  startAt: number;
  endAt: number;
  timeLabel: string;
  url: string;
};

/** Real festival timestamps only; demo time must never schedule device notifications. */
export function buildFestivalActivityEvents(favorites: string[], data: AppData, now = Date.now()): FestivalActivityEvent[] {
  const selected = new Set(favorites);
  const rows: FestivalActivityEvent[] = [];
  for (const kind of ['performance', 'autograph'] as const) {
    const events = kind === 'performance' ? data.schedule : data.autographs;
    for (const event of events) {
      const id = `${kind === 'performance' ? 'perf' : 'auto'}:${event.id}`;
      if (!selected.has(id)) continue;
      const startAt = parseFestivalLocalDateTime(event.date, event.startTime).getTime();
      let endAt = parseFestivalLocalDateTime(event.date, event.endTime).getTime();
      if (endAt <= startAt) endAt = parseFestivalLocalDateTime(addDaysToDateString(event.date, 1), event.endTime).getTime();
      if (!Number.isFinite(startAt) || !Number.isFinite(endAt) || endAt <= now || endAt <= startAt) continue;
      rows.push({
        id, kind, artist: event.artist,
        stage: ('location' in event && event.location) || data.stages.find(stage => stage.id === event.stageId)?.name || 'Площадка фестиваля',
        startAt, endAt, timeLabel: `${event.startTime}–${event.endTime}`,
        url: kind === 'performance' ? `/schedule/live/${encodeURIComponent(event.id)}` : `/autographs/${encodeURIComponent(event.id)}`,
      });
    }
  }
  return rows.sort((a, b) => a.startAt - b.startAt || a.id.localeCompare(b.id)).slice(0, 100);
}
