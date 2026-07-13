import type {
  HeadlinerLastFmImage,
  HeadlinerLastFmProfile,
  HeadlinerLastFmSimilarArtist,
  HeadlinerLastFmTag,
  HeadlinerLastFmTrack,
} from '@/lastfm-types';
import { lastFmFetch, resolveLastFmProxyUrl } from './lastfm-fetch';

const API_BASE = 'https://ws.audioscrobbler.com/2.0/';

type LastFmImage = { '#text': string; size: string };
type LastFmTag = { name: string; url: string };
type LastFmSimilarArtist = { name: string; url: string };
type LastFmArtistInfo = {
  name: string;
  mbid?: string;
  url?: string;
  ontour?: string;
  image?: LastFmImage[];
  stats?: { listeners?: string; playcount?: string };
  tags?: { tag?: LastFmTag[] | LastFmTag };
  similar?: { artist?: LastFmSimilarArtist[] | LastFmSimilarArtist };
  bio?: { summary?: string; published?: string };
};
type LastFmTrack = {
  name: string;
  playcount?: string;
  listeners?: string;
  url?: string;
  duration?: string;
  mbid?: string;
  '@attr'?: { rank?: string };
};
type LastFmSearchArtist = {
  name: string;
  listeners?: string;
  mbid?: string;
  url?: string;
};

function getApiKey(): string {
  const apiKey = process.env.LASTFM_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'LASTFM_API_KEY is not set. Add it to cms/.env on the server or to GitHub Environment production Secrets and redeploy (deploy writes cms/.env).',
    );
  }
  return apiKey;
}

export function assertLastFmConfigured(): void {
  getApiKey();
}

function isFatalLastFmError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('LASTFM_API_KEY') ||
    message.includes('Invalid API key') ||
    message.includes('You have been banned') ||
    message.includes('HTTP 403') ||
    message.includes('HTTP 429')
  );
}

function toNumber(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function stripHtml(value: string): string {
  return value
    .replace(/<a\b[^>]*>(.*?)<\/a>/gi, '$1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+\n/g, '\n')
    .trim();
}

function mapImages(images: LastFmImage[] | undefined): HeadlinerLastFmImage[] {
  return asArray(images)
    .map((image) => ({
      url: image['#text']?.trim() ?? '',
      size: image.size,
    }))
    .filter((image) => image.url.length > 0);
}

function mapTags(tags: LastFmTag[] | LastFmTag | undefined): HeadlinerLastFmTag[] {
  return asArray(tags)
    .map((tag) => ({
      name: tag.name?.trim() ?? '',
      url: tag.url?.trim() ?? '',
    }))
    .filter((tag) => tag.name.length > 0);
}

function mapSimilarArtists(
  artists: LastFmSimilarArtist[] | LastFmSimilarArtist | undefined,
): HeadlinerLastFmSimilarArtist[] {
  return asArray(artists)
    .map((artist) => ({
      name: artist.name?.trim() ?? '',
      url: artist.url?.trim() ?? '',
    }))
    .filter((artist) => artist.name.length > 0)
    .slice(0, 8);
}

function mapTopTracks(tracks: LastFmTrack[] | LastFmTrack | undefined): HeadlinerLastFmTrack[] {
  return asArray(tracks)
    .map((track) => ({
      name: track.name?.trim() ?? '',
      rank: toNumber(track['@attr']?.rank) ?? 0,
      playcount: toNumber(track.playcount),
      listeners: toNumber(track.listeners),
      url: track.url?.trim() || undefined,
      durationSec: toNumber(track.duration),
      mbid: track.mbid?.trim() || undefined,
    }))
    .filter((track) => track.name.length > 0)
    .sort((a, b) => {
      const playDiff = (b.playcount ?? 0) - (a.playcount ?? 0);
      if (playDiff !== 0) {
        return playDiff;
      }
      const listenerDiff = (b.listeners ?? 0) - (a.listeners ?? 0);
      if (listenerDiff !== 0) {
        return listenerDiff;
      }
      return a.rank - b.rank;
    })
    .map((track, index) => ({ ...track, rank: index + 1 }));
}

async function callLastFm<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(API_BASE);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set('api_key', getApiKey());
  url.searchParams.set('format', 'json');

  const response = await lastFmFetch(url);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    if (response.status === 403) {
      const proxyHint = resolveLastFmProxyUrl()
        ? ' (proxy is configured but request was still blocked)'
        : ' — VPS IP may be blocked; set LASTFM_PROXY_URL in cms/.env';
      throw new Error(`Last.fm HTTP 403${proxyHint}${body ? `: ${body.slice(0, 160)}` : ''}`);
    }
    throw new Error(`Last.fm HTTP ${response.status}${body ? `: ${body.slice(0, 160)}` : ''}`);
  }

  const payload = (await response.json()) as { error?: number; message?: string } & T;
  if (payload.error) {
    throw new Error(payload.message ?? `Last.fm error ${payload.error}`);
  }

  return payload;
}

export async function verifyLastFmApiKey(): Promise<void> {
  assertLastFmConfigured();
  await callLastFm<{ artist?: { name?: string } }>({
    method: 'artist.getinfo',
    artist: 'DDT',
    autocorrect: '1',
  });
}

export async function searchLastFmArtist(query: string): Promise<LastFmSearchArtist | null> {
  const payload = await callLastFm<{ results?: { artistmatches?: { artist?: LastFmSearchArtist[] | LastFmSearchArtist } } }>({
    method: 'artist.search',
    artist: query,
    limit: '5',
  });

  const matches = asArray(payload.results?.artistmatches?.artist);
  if (!matches.length) {
    return null;
  }

  return matches.sort((a, b) => (toNumber(b.listeners) ?? 0) - (toNumber(a.listeners) ?? 0))[0] ?? null;
}

export async function fetchLastFmArtistProfile(
  artistName: string,
  searchQuery?: string,
): Promise<HeadlinerLastFmProfile | null> {
  const [infoPayload, tracksPayload] = await Promise.all([
    callLastFm<{ artist?: LastFmArtistInfo }>({
      method: 'artist.getinfo',
      artist: artistName,
      autocorrect: '1',
    }),
    callLastFm<{ toptracks?: { track?: LastFmTrack[] | LastFmTrack } }>({
      method: 'artist.gettoptracks',
      artist: artistName,
      limit: '10',
      autocorrect: '1',
    }),
  ]);

  const artist = infoPayload.artist;
  if (!artist?.name) {
    return null;
  }

  return {
    mbid: artist.mbid?.trim() || undefined,
    name: artist.name.trim(),
    url: artist.url?.trim() || undefined,
    listeners: toNumber(artist.stats?.listeners),
    playcount: toNumber(artist.stats?.playcount),
    onTour: artist.ontour === '1',
    bioSummary: artist.bio?.summary ? stripHtml(artist.bio.summary) : undefined,
    bioPublished: artist.bio?.published?.trim() || undefined,
    tags: mapTags(artist.tags?.tag),
    similarArtists: mapSimilarArtists(artist.similar?.artist),
    topTracks: mapTopTracks(tracksPayload.toptracks?.track),
    images: mapImages(artist.image),
    updatedAt: new Date().toISOString(),
    searchQuery,
  };
}

export function buildLastFmSearchQueries(name: string): string[] {
  const queries = new Set<string>();
  const trimmed = name.trim();
  if (!trimmed) {
    return [];
  }

  queries.add(trimmed);

  const withoutQuotes = trimmed.replace(/[«»"'`]/g, '').trim();
  if (withoutQuotes) {
    queries.add(withoutQuotes);
  }

  for (const part of trimmed.split('/')) {
    const piece = part.trim();
    if (piece) {
      queries.add(piece);
    }
  }

  const latinOnly = trimmed.replace(/[а-яёА-ЯЁ]/g, '').replace(/\s+/g, ' ').trim();
  if (latinOnly.length >= 2) {
    queries.add(latinOnly);
  }

  return [...queries];
}

export async function resolveLastFmProfileForHeadliner(
  headlinerName: string,
): Promise<HeadlinerLastFmProfile | null> {
  const queries = buildLastFmSearchQueries(headlinerName);

  for (const query of queries) {
    try {
      const direct = await fetchLastFmArtistProfile(query, query);
      if (direct) {
        return direct;
      }
    } catch (error) {
      if (isFatalLastFmError(error)) {
        throw error;
      }
    }

    try {
      const match = await searchLastFmArtist(query);
      if (match?.name) {
        const profile = await fetchLastFmArtistProfile(match.name, query);
        if (profile) {
          return profile;
        }
      }
    } catch (error) {
      if (isFatalLastFmError(error)) {
        throw error;
      }
    }
  }

  return null;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
