import { RADIO_STATION_ID } from '../config/radio';

export type RadioNowPlaying = {
  kind?: 'track' | 'jingle';
  id?: number;
  title: string;
  artist: string;
  raw: string;
  artworkUrl?: string;
  duration?: number;
  position?: number;
};

export type RadioSnapshot = RadioNowPlaying & {
  source: 'liscase';
  stationId: number;
  available: boolean;
  updatedAt: string;
  queue: RadioNowPlaying[];
  previous: RadioNowPlaying | null;
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function seconds(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function track(value: unknown): RadioNowPlaying | null {
  const item = record(value);
  if (!item) return null;
  const title = typeof item.title === 'string' ? item.title.trim() : '';
  const artist = typeof item.artist === 'string' ? item.artist.trim() : '';
  if (!title && !artist) return null;
  let artworkUrl: string | undefined;
  try {
    const cover = new URL(typeof item.cover === 'string' ? item.cover : '');
    if (cover.protocol === 'https:') artworkUrl = cover.href;
  } catch { /* Missing artwork uses the festival artist image or station artwork. */ }
  return {
    kind: item.kind === 'jingle' ? 'jingle' : 'track',
    id: typeof item.id === 'number' ? item.id : undefined,
    title, artist, raw: [artist, title].filter(Boolean).join(' — '), artworkUrl,
    duration: seconds(item.duration), position: seconds(item.position),
  };
}

/** An empty/offline station is a valid state; malformed or foreign responses are not. */
export function parseLiscaseRadioSnapshot(value: unknown, now = new Date()): RadioSnapshot {
  const envelope = record(value);
  const state = record(envelope?.data);
  const station = record(state?.station);
  if (envelope?.success !== true || !state || typeof state.available !== 'boolean'
    || !Array.isArray(state.queue) || (station && station.id !== RADIO_STATION_ID)) {
    throw new Error('Invalid radio station response');
  }
  const available = state.available && state.healthy !== false;
  const current = available ? track(state.current) : null;
  return {
    ...(current ?? { title: '', artist: '', raw: '' }),
    source: 'liscase', stationId: RADIO_STATION_ID, available,
    updatedAt: typeof state.updatedAt === 'string' && Number.isFinite(Date.parse(state.updatedAt))
      ? state.updatedAt : now.toISOString(),
    queue: available ? state.queue.slice(0, 100).map(track).filter((item): item is RadioNowPlaying => item !== null && item.kind !== 'jingle') : [],
    previous: record(state.previous)?.kind === 'jingle' ? null : track(state.previous),
  };
}
