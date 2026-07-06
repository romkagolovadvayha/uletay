export const SITE_NAME = 'УЛЕТАЙ 2026';

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
  (typeof process !== 'undefined' && process.env.EXPO_PUBLIC_SITE_URL) || 'https://uletay.ru';

export const SITE_URL = normalizeSiteUrl(configuredSiteUrl);

export const DEFAULT_DESCRIPTION =
  'Официальное приложение фестиваля УЛЕТАЙ в Лагуново, Удмуртия: расписание концертов, карта площадки, автограф-сессии, фудкорт и радио в эфире.';

export const DEFAULT_KEYWORDS =
  'УЛЕТАЙ, фестиваль, Лагуново, Удмуртия, расписание, карта, концерты, автографы, фудкорт';
