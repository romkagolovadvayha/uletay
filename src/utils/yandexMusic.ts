const YANDEX_MUSIC_SEARCH_URL = 'https://music.yandex.ru/search';

export function buildYandexMusicArtistSearchUrl(artist: string): string {
  const url = new URL(YANDEX_MUSIC_SEARCH_URL);
  url.searchParams.set('text', artist.trim());
  return url.toString();
}

export function buildYandexMusicSearchUrl(artist: string, track: string): string {
  const query = [artist.trim(), track.trim()].filter(Boolean).join(' ');
  const url = new URL(YANDEX_MUSIC_SEARCH_URL);
  url.searchParams.set('text', query);
  return url.toString();
}
