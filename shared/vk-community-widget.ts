import type { selectVkHeadliners } from './vk-headliners';
import { isVkMusicUrl } from './vk-headliners';

// This Mini App is independent of the CMS VK ID login application.
export const VK_HEADLINERS_APP_ID = 54834082;
export const VK_HEADLINERS_TEST_GROUP_ID = 242402250;
export const VK_HEADLINERS_APP_URL = `https://vk.com/app${VK_HEADLINERS_APP_ID}`;

// Official community links from murakamiband.ru, knyazz.ru, pilot's official
// Telegram, fpg-live.ru, planlomonosova.com and affinageband.ru; resolved via VK.
const COMMUNITY_ICONS: Record<string, number> = {
  'hl-мураками': 131128,
  'hl-княzz': 1227,
  'hl-пилот': 38465,
  'hl-f-p-g': 5928257,
  'hl-план-ломоносова': 30006666,
  'hl-аффинаж': 43343704,
};

type Card = ReturnType<typeof selectVkHeadliners>[number];
export type WidgetLayout = 'tiles' | 'compact_list';
const singleLine = (value: string, limit: number) => value.replace(/[\r\n]+/g, ' ').slice(0, limit).replace(/[\uD800-\uDBFF]$/, '');

/** Native VK widgets accept VK links and collection/portrait IDs, never HTML. */
export function buildCommunityWidget(cards: Card[], dates: string, year: number, layout: WidgetLayout = 'tiles') {
  const selected = cards.slice(0, 6);
  if (!selected.length) throw new Error('Сначала объявите участников фестиваля.');
  const hasIcons = selected.every((card) => COMMUNITY_ICONS[card.id]);
  // Tiles require at least three items and a picture for each item.
  const type: WidgetLayout = layout === 'tiles' && selected.length >= 3 && hasIcons ? 'tiles' : 'compact_list';
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
    title: singleLine(`🔥 Кто едет на УЛЕТАЙ · ${dates} ${year}`, 100),
    title_url: VK_HEADLINERS_APP_URL,
    ...(type === 'tiles' ? { tiles: entries } : { rows: entries }),
    more: 'Все участники, таймер и билеты →',
    more_url: VK_HEADLINERS_APP_URL,
  };
  // JSON encoding prevents CMS text from becoming executable VKScript.
  return { type, code: `return ${JSON.stringify(widget)};` };
}

export function widgetSetupContext(search: string, hash: string) {
  const params = new URLSearchParams(search);
  const appId = Number(params.get('vk_app_id'));
  const inApp = appId === VK_HEADLINERS_APP_ID;
  const inTestGroup = Number(params.get('vk_group_id')) === VK_HEADLINERS_TEST_GROUP_ID;
  const admin = params.get('vk_viewer_group_role') === 'admin';
  return {
    inApp,
    // UI hint only: authorization is always checked by VK's native dialogs.
    visible: hash === '#setup' || (inApp && inTestGroup && admin),
    inTestGroup: inApp && inTestGroup && admin,
  };
}
