import type { Headliner } from '../types';
import type { HeadlinerLastFmTrack } from '../types/lastfm';

const YANDEX_MUSIC_SEARCH_URL = 'https://music.yandex.ru/search';

function normalizeNameKey(name: string): string {
  return name
    .toLocaleLowerCase('ru')
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapSourceNameToDisplay(
  sourceName: string,
  headliner: Pick<Headliner, 'name' | 'alternateNames'>,
): string {
  const sourceKey = normalizeNameKey(sourceName);
  const mainKey = normalizeNameKey(headliner.name);

  if (sourceKey === mainKey) {
    return headliner.name;
  }

  for (const alternateName of headliner.alternateNames ?? []) {
    const trimmed = alternateName.trim();
    if (trimmed && normalizeNameKey(trimmed) === sourceKey) {
      return trimmed;
    }
  }

  return sourceName;
}

/** Artist name for Yandex search — prefers per-track Last.fm artist (group members). */
export function resolveTrackYandexArtist(
  headliner: Pick<Headliner, 'name' | 'alternateNames'>,
  track: Pick<HeadlinerLastFmTrack, 'name' | 'artistName'>,
): string {
  const sourceName = track.artistName?.trim() || headliner.name;
  return mapSourceNameToDisplay(sourceName, headliner);
}

export function buildYandexMusicArtistSearchUrl(artist: string): string {
  const url = new URL(YANDEX_MUSIC_SEARCH_URL);
  url.searchParams.set('text', artist.trim());
  return url.toString();
}

export function buildYandexMusicTrackSearchUrl(track: string, artist: string): string {
  const query = [track.trim(), artist.trim()].filter(Boolean).join(' ');
  const url = new URL(YANDEX_MUSIC_SEARCH_URL);
  url.searchParams.set('text', query);
  return url.toString();
}

export function buildYandexMusicSearchUrl(artist: string, track: string): string {
  return buildYandexMusicTrackSearchUrl(track, artist);
}
