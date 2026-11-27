import { createHash } from 'node:crypto';
import type { AppData } from '@/types';

export const ACTIVITY_MAX_AGE_MS = 8 * 60 * 60_000;
const APPLE_REFERENCE_SECONDS = 978307200;
export type FestivalActivityState = {
  endAt: number; artist?: string; stage?: string; kind?: string;
  startAt?: number; timeLabel?: string; url?: string; status: 'upcoming' | 'live' | 'ended';
};
// Foundation Date's default Codable representation is seconds since 2001,
// whereas the APNs envelope uses Unix seconds. Never use ISO date encoding here.
export const activityDate = (milliseconds: number) => milliseconds / 1000 - APPLE_REFERENCE_SECONDS;

export function festivalActivityStates(data: Pick<AppData, 'schedule' | 'autographs' | 'stages'>, now: number) {
  const states = new Map<string, FestivalActivityState>();
  for (const kind of ['performance', 'autograph'] as const) {
    for (const event of kind === 'performance' ? data.schedule : data.autographs) {
      const start = Date.parse(`${event.date}T${event.startTime}:00+04:00`);
      let end = Date.parse(`${event.date}T${event.endTime}:00+04:00`);
      if (end <= start) end += 24 * 60 * 60_000;
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
      const key = `${kind === 'performance' ? 'perf' : 'auto'}:${event.id}`;
      states.set(key, {
        artist: event.artist, stage: ('location' in event && event.location) || data.stages.find(s => s.id === event.stageId)?.name || 'Площадка фестиваля',
        kind, startAt: activityDate(start), endAt: activityDate(end), timeLabel: `${event.startTime}–${event.endTime}`,
        url: kind === 'performance' ? `/schedule/live/${encodeURIComponent(event.id)}` : `/autographs/${encodeURIComponent(event.id)}`,
        status: now >= end ? 'ended' : now >= start ? 'live' : 'upcoming',
      });
    }
  }
  return states;
}

export function festivalActivityPayload(state: FestivalActivityState, timestamp: number, end = false) {
  const ended = end || state.status === 'ended';
  return { aps: {
    timestamp, event: ended ? 'end' as const : 'update' as const,
    'content-state': { ...state, ...(ended ? { status: 'ended' as const } : {}) },
    'stale-date': Math.max(timestamp, Math.floor(state.endAt + APPLE_REFERENCE_SECONDS)),
    ...(ended ? { 'dismissal-date': timestamp } : {}),
  } };
}
export const activityStateHash = (state: FestivalActivityState, end: boolean) => createHash('sha256').update(JSON.stringify({ ...state, status: end ? 'ended' : state.status })).digest('hex');

export type ActivityRegistration = {
  activityId: string; favoriteKey: string; pushToken: string; environment: 'production' | 'sandbox';
};
export type ActivityInstallation = {
  installationId: string; secret: string; revision: number; enabled: boolean; activities: ActivityRegistration[];
};
export function parseActivityInstallation(value: unknown): ActivityInstallation {
  const input = value as ActivityInstallation;
  if (!input || typeof input !== 'object' || !/^[0-9a-f-]{36}$/i.test(input.installationId) ||
      typeof input.secret !== 'string' || !/^[0-9a-f]{64}$/i.test(input.secret) ||
      !Number.isSafeInteger(input.revision) || input.revision < 1 || typeof input.enabled !== 'boolean' ||
      !Array.isArray(input.activities) || input.activities.length > 10) throw Error('Invalid Live Activity registration');
  const ids = new Set<string>(), tokens = new Set<string>();
  for (const row of input.activities) {
    if (!row || typeof row.activityId !== 'string' || !/^[A-Za-z0-9-]{1,128}$/.test(row.activityId) ||
        typeof row.favoriteKey !== 'string' || !/^(perf|auto):[^\s\u0000-\u001f\u007f]{1,220}$/.test(row.favoriteKey) ||
        typeof row.pushToken !== 'string' || !/^[a-f0-9]{64,512}$/i.test(row.pushToken) ||
        !['production', 'sandbox'].includes(row.environment) || ids.has(row.activityId) || tokens.has(row.pushToken.toLowerCase())) throw Error('Invalid Live Activity token');
    ids.add(row.activityId); tokens.add(row.pushToken.toLowerCase());
  }
  return { ...input, activities: input.activities.map(row => ({ ...row, pushToken: row.pushToken.toLowerCase() })) };
}
