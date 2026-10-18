import type { AppData, Headliner } from '../src/types';
import { encodeSeoRouteId } from '../src/seo/seoRouteUtils';

/** Accept music destinations only; CMS content must not introduce arbitrary redirects. */
export function isVkMusicUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 1000) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      ['vk.com', 'vk.ru', 'music.vk.com', 'music.vk.ru'].includes(url.hostname) &&
      /^\/(artist\/[^/]+|music(?:\/.*)?|audio(?:s|-)?[^/]*)(?:\/)?$/.test(url.pathname);
  } catch { return false; }
}

// Links published by the artists. Editors can override these in the CMS.
export const VERIFIED_VK_MUSIC: Record<string, string> = {
  // https://murakamiband.ru/ — «VK Музыка».
  'hl-мураками': 'https://vk.ru/artist/murakami',
  // https://t.me/s/planlomonosova?q=%23музло
  'hl-план-ломоносова': 'https://vk.com/artist/planlomonosova',
  // https://t.me/s/knyazzband2010?q=vk.com — official album link.
  'hl-княzz': 'https://vk.com/audio?z=audio_playlist-2000950650_23950650/6f0481d31f45fd27e2',
  // https://band.link/drugoe_storona_A — artist's official release page.
  'hl-аффинаж': 'https://vk.com/music/album/-2000267148_13267148_356d205a0f4fb85ffd',
};

/** Dates are calendar dates in Udmurtia (UTC+04), independent of the visitor's zone. */
export function festivalCountdown(startDate: string, endDate: string, now: number) {
  const start = Date.parse(`${startDate}T00:00:00+04:00`);
  const end = Date.parse(`${endDate}T00:00:00+04:00`) + 86400000;
  const state = now < start ? 'before' : now < end ? 'during' : 'after';
  const remaining = Math.max(0, Math.ceil((start - now) / 1000));
  return {
    state,
    days: Math.floor(remaining / 86400),
    hours: Math.floor(remaining / 3600) % 24,
    minutes: Math.floor(remaining / 60) % 60,
    seconds: remaining % 60,
  };
}

const GENRES: Record<string, string> = {
  rock: 'Рок', 'russian rock': 'Русский рок', 'punk rock': 'Панк-рок', punk: 'Панк-рок',
  'folk rock': 'Фолк-рок', folk: 'Фолк', 'folk metal': 'Фолк-метал', 'hard rock': 'Хард-рок',
  'heavy metal': 'Хеви-метал', metal: 'Метал', 'thrash metal': 'Трэш-метал',
  alternative: 'Альтернатива', 'alternative rock': 'Альтернативный рок',
  acoustic: 'Акустика', 'chanson noir': 'Нуар-шансон', grunge: 'Гранж',
  'art rock': 'Арт-рок', 'pop rock': 'Поп-рок', 'indie rock': 'Инди-рок',
  rap: 'Рэп', 'hip-hop': 'Хип-хоп', hiphop: 'Хип-хоп', electronic: 'Электроника',
  ska: 'Ска', 'ska punk': 'Ска-панк', blues: 'Блюз', industrial: 'Индастриал',
};

export function headlinerSubtitle(artist: Headliner, year: number): string {
  if (artist.vkSubtitle?.trim()) return artist.vkSubtitle.trim();
  const genres = [...new Set((artist.lastfm?.tags ?? [])
    .map(({ name }) => GENRES[name.trim().toLowerCase()]).filter(Boolean))];
  const specific = genres.length > 1 ? genres.filter((genre) => genre !== 'Рок') : genres;
  return specific.slice(0, 2).join(' · ') || `Участник УЛЕТАЙ ${year}`;
}

export function selectVkHeadliners(data: Pick<AppData, 'festival' | 'headliners'>, siteUrl: string) {
  const year = data.festival.year;
  return data.headliners.filter((artist) => artist.years.includes(year)).slice(0, 6).map((artist) => {
    const configured = artist.vkMusicUrl || VERIFIED_VK_MUSIC[artist.id];
    const directMusic = isVkMusicUrl(configured);
    let imageUrl: string | null = null;
    try {
      const image = new URL(artist.imageUrl || '', siteUrl);
      if (artist.imageUrl && image.protocol === 'https:') imageUrl = image.href;
    } catch { /* Missing pictures use the branded placeholder. */ }
    return {
      id: artist.id,
      name: artist.name,
      subtitle: headlinerSubtitle(artist, year),
      imageUrl,
      detailUrl: `${siteUrl}/headliners/${encodeURIComponent(encodeSeoRouteId(artist.id))}`,
      musicUrl: directMusic ? configured : `https://vk.com/audio?q=${encodeURIComponent(artist.name)}`,
      musicLabel: directMusic ? 'Слушать в VK' : 'Найти в VK Музыке',
    };
  });
}
