import type { selectVkHeadliners } from './vk-headliners';
import { festivalCountdown, isVkMusicUrl } from './vk-headliners';

// This Mini App is independent of the CMS VK ID login application.
export const VK_HEADLINERS_APP_ID = 54834082;
export const VK_HEADLINERS_TEST_GROUP_ID = 242402250;
export const VK_HEADLINERS_APP_URL = `https://vk.com/app${VK_HEADLINERS_APP_ID}`;

/** VK documents a string group_id; some clients return a number. */
export function isHeadlinersTestGroup(groupId: unknown) {
  return groupId === VK_HEADLINERS_TEST_GROUP_ID || groupId === String(VK_HEADLINERS_TEST_GROUP_ID);
}

// Official community links from murakamiband.ru, knyazz.ru, pilot's official
// Telegram, fpg-live.ru, planlomonosova.com and affinageband.ru; resolved via VK.
// Additional verified communities: stigmata.band.link, t.me/chaifru,
// vk.com/molodost_vnutri (links back to molodostvnutri.ru), and hmirov.ru.
const COMMUNITY_ICONS: Record<string, number> = {
  'hl-мураками': 131128,
  'hl-княzz': 1227,
  'hl-пилот': 38465,
  'hl-f-p-g': 5928257,
  'hl-план-ломоносова': 30006666,
  'hl-аффинаж': 43343704,
  'hl-стигмата-stigmata': 8795,
  'hl-чайф': 186047,
  'hl-молодость-внутри': 147378898,
  'hl-хмыров': 156554689,
};

type Card = ReturnType<typeof selectVkHeadliners>[number];
export type WidgetLayout = 'tiles' | 'compact_list';
export type WidgetCountdown = { startDate: string; endDate: string; now: number };
const singleLine = (value: string, limit: number) => value.replace(/[\r\n]+/g, ' ').slice(0, limit).replace(/[\uD800-\uDBFF]$/, '');

export function communityWidgetTitle(dates: string, year: number, countdown?: WidgetCountdown) {
  const title = `🔥 Хедлайнеры УЛЕТАЙ · ${dates} ${year}`;
  if (!countdown) return singleLine(title, 100);
  const remaining = festivalCountdown(countdown.startDate, countdown.endDate, countdown.now);
  if (remaining.state !== 'before') {
    return singleLine(`${title} · ${remaining.state === 'during' ? 'Фестиваль идёт' : 'До новых встреч!'}`, 100);
  }
  const days = remaining.days;
  const word = days % 100 >= 11 && days % 100 <= 14 ? 'дней' : days % 10 === 1 ? 'день' : days % 10 >= 2 && days % 10 <= 4 ? 'дня' : 'дней';
  return singleLine(`${title} · ${days ? `Через ${days} ${word}` : 'Менее суток'}`, 100);
}

/** VK permits up to ten tiles or six rows without accompanying text. */
export function selectCommunityWidgetCards(cards: Card[], layout: WidgetLayout = 'tiles'): { type: WidgetLayout; selected: Card[] } {
  const tiles = cards.slice(0, 10);
  if (layout === 'tiles' && tiles.length >= 3 && tiles.every((card) => COMMUNITY_ICONS[card.id])) {
    return { type: 'tiles', selected: tiles };
  }
  return { type: 'compact_list', selected: cards.slice(0, 6) };
}

/** Native VK widgets accept VK links and collection/portrait IDs, never HTML. */
export function buildCommunityWidget(cards: Card[], dates: string, year: number, layout: WidgetLayout = 'tiles', countdown?: WidgetCountdown) {
  const { selected, type } = selectCommunityWidgetCards(cards, layout);
  if (!selected.length) throw new Error('Сначала объявите участников фестиваля.');
  const hasIcons = selected.every((card) => COMMUNITY_ICONS[card.id]);
  const entries = selected.map((card) => {
    const url = `${VK_HEADLINERS_APP_URL}#artist=${encodeURIComponent(card.id)}`;
    const music = isVkMusicUrl(card.musicUrl) ? new URL(card.musicUrl) : new URL(`https://vk.com/audio?q=${encodeURIComponent(card.name)}`);
    // Native widget links support vk.com; vk.ru music links have the same path.
    music.hostname = 'vk.com';
    const common = {
      title: singleLine(card.name, 50),
      descr: singleLine(card.subtitle, type === 'tiles' ? 50 : 100),
      ...(hasIcons ? { icon_id: `club${COMMUNITY_ICONS[card.id]}` } : {}),
    };
    return type === 'tiles'
      ? { ...common, url, link: singleLine(card.musicLabel, 50), link_url: music.href }
      : { ...common, title_url: url, button: singleLine(card.musicLabel, 50), button_url: music.href };
  });
  const widget = {
    title: communityWidgetTitle(dates, year, countdown),
    title_url: VK_HEADLINERS_APP_URL,
    ...(type === 'tiles' ? { tiles: entries } : { rows: entries }),
    more: `Все участники · ${cards.length} →`,
    more_url: VK_HEADLINERS_APP_URL,
  };
  // JSON encoding prevents CMS text from becoming executable VKScript.
  return { type, code: `return ${JSON.stringify(widget)};` };
}

export function widgetSetupContext(search: string, hash: string) {
  const params = new URLSearchParams(search);
  const appId = Number(params.get('vk_app_id'));
  const inApp = appId === VK_HEADLINERS_APP_ID;
  const inTestGroup = isHeadlinersTestGroup(params.get('vk_group_id'));
  const admin = params.get('vk_viewer_group_role') === 'admin';
  return {
    inApp,
    // UI hint only: authorization is always checked by VK's native dialogs.
    visible: hash === '#setup' || (inApp && inTestGroup && admin),
    inTestGroup: inApp && inTestGroup && admin,
  };
}
