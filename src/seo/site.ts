export const DEFAULT_FESTIVAL_YEAR = 2027;

export function getSiteName(festivalYear: number | null | undefined): string {
  const year =
    typeof festivalYear === 'number' && Number.isInteger(festivalYear) && festivalYear > 0
      ? festivalYear
      : DEFAULT_FESTIVAL_YEAR;
  return `УЛЕТАЙ ${year}`;
}

export const SITE_NAME = getSiteName(DEFAULT_FESTIVAL_YEAR);

function normalizeSiteUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.startsWith('www.')) {
      parsed.hostname = parsed.hostname.slice(4);
    }
    return parsed.origin;
  } catch {
    return url.replace(/\/$/, '');
  }
}

const configuredSiteUrl =
  (typeof process !== 'undefined' && process.env.EXPO_PUBLIC_SITE_URL) || 'https://uletayapp.ru';

export const SITE_URL = normalizeSiteUrl(configuredSiteUrl);

export const DEFAULT_DESCRIPTION =
  'Приложение фестиваля УЛЕТАЙ в Лагуново, Удмуртия: расписание концертов, карта площадки, автограф-сессии, фудкорт и радио в эфире.';

export const DEFAULT_KEYWORDS =
  'УЛЕТАЙ, фестиваль, Лагуново, Удмуртия, расписание, карта, концерты, автографы, фудкорт';

export const DEFAULT_SOCIAL_IMAGE_PATH = '/hero-video-poster.webp';

export const DEFAULT_SOCIAL_IMAGE_URL = new URL(
  DEFAULT_SOCIAL_IMAGE_PATH,
  `${SITE_URL.replace(/\/$/, '')}/`,
).href;
