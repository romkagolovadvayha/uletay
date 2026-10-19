import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { AppData, Headliner } from '../src/types';
import { syncAppHeadliners } from '../src/lib/headliners';
import { validateAppData } from '../../shared/app-data-validation';
import { festivalCountdown, headlinerSubtitle, isVkMusicUrl, selectVkHeadliners } from '../../shared/vk-headliners';
import { buildCommunityWidget, communityWidgetTitle, isHeadlinersTestGroup, VK_HEADLINERS_APP_ID, VK_HEADLINERS_APP_URL, widgetSetupContext } from '../../shared/vk-community-widget';

const data = JSON.parse(readFileSync(new URL('../seed/content.json', import.meta.url), 'utf8')) as AppData;
const artist: Headliner = { id: 'a', name: 'Артист', description: '', imageTint: '#000', years: [2027], vkMusicUrl: 'https://vk.ru/artist/test', vkSubtitle: 'Фолк · Рок' };
data.festival.year = 2027;
data.headliners = [{ ...artist, id: 'archive', years: [2026] }, ...Array.from({ length: 13 }, (_, i) => ({ ...artist, id: `artist-${i}` }))];
data.schedule = [];
data.autographs = [];
const cards = selectVkHeadliners(data, 'https://uletayapp.ru');
assert.equal(cards.length, 13, 'The Mini App must include the whole current lineup');
assert.deepEqual(cards.map((card) => card.id), Array.from({ length: 13 }, (_, i) => `artist-${i}`));
const rankedArtists: Headliner[] = [
  { ...artist, id: 'unknown', name: 'Без статистики' },
  { ...artist, id: 'tie-b', name: 'Бета', lastfm: { name: 'Бета', listeners: 100, playcount: 200, tags: [], similarArtists: [], topTracks: [], updatedAt: '2026-10-19' } },
  { ...artist, id: 'most-plays', name: 'Прослушивания', lastfm: { name: 'Прослушивания', listeners: 100, playcount: 300, tags: [], similarArtists: [], topTracks: [], updatedAt: '2026-10-19' } },
  { ...artist, id: 'most-listeners', name: 'Слушатели', lastfm: { name: 'Слушатели', listeners: 101, playcount: 0, tags: [], similarArtists: [], topTracks: [], updatedAt: '2026-10-19' } },
  { ...artist, id: 'tie-a', name: 'Альфа', lastfm: { name: 'Альфа', listeners: 100, playcount: 200, tags: [], similarArtists: [], topTracks: [], updatedAt: '2026-10-19' } },
];
const originalOrder = rankedArtists.map(({ id }) => id);
assert.deepEqual(selectVkHeadliners({ ...data, headliners: rankedArtists }, 'https://uletayapp.ru').map(({ id }) => id), ['most-listeners', 'most-plays', 'tie-a', 'tie-b', 'unknown']);
assert.deepEqual(rankedArtists.map(({ id }) => id), originalOrder, 'Popularity sorting must not mutate CMS content');
assert(cards.every((card) => card.musicLabel === 'Слушать в VK' && card.subtitle === artist.vkSubtitle));
assert.equal(selectVkHeadliners({ ...data, headliners: [{ ...artist, years: [2026] }] }, 'https://uletayapp.ru').length, 0, 'Do not misrepresent an archive as the current lineup');
assert.equal(selectVkHeadliners({ ...data, headliners: [artist] }, 'https://uletayapp.ru').length, 1);
assert(validateAppData(data));
const normalized = syncAppHeadliners({ ...data, headliners: [artist] });
assert.equal(normalized.headliners[0].vkMusicUrl, artist.vkMusicUrl, 'Normalization must retain editor music links');
assert.equal(normalized.headliners[0].vkSubtitle, artist.vkSubtitle);
for (const url of ['http://vk.ru/artist/a', 'https://vk.ru.evil.test/artist/a', 'https://evil.test/music', 'javascript:alert(1)', 'https://user@vk.ru/artist/a', 'https://vk.ru/away.php?to=x']) assert(!isVkMusicUrl(url), url);
for (const url of ['https://vk.ru/artist/murakami', 'https://vk.com/music/playlist/-123_456', 'https://vk.com/audios-123']) assert(isVkMusicUrl(url), url);
assert(!validateAppData({ ...data, headliners: [{ ...artist, vkMusicUrl: 'javascript:alert(1)' }] }));
assert(!validateAppData({ ...data, headliners: [{ ...artist, vkSubtitle: 'a'.repeat(71) }] }));
const withoutLink = { ...artist, vkMusicUrl: undefined, vkSubtitle: undefined };
assert.equal(selectVkHeadliners({ ...data, headliners: [withoutLink] }, 'https://uletayapp.ru')[0].musicLabel, 'Найти в VK Музыке');
assert.equal(headlinerSubtitle({ ...withoutLink, lastfm: { tags: [{ name: 'russian' }, { name: 'punk rock' }, { name: 'punk' }, { name: 'art rock' }] } as Headliner['lastfm'] }, 2027), 'Панк-рок · Арт-рок');
const escaped = selectVkHeadliners({ ...data, headliners: [{ ...artist, id: 'a/b.c', imageUrl: 'javascript:alert(1)' }] }, 'https://uletayapp.ru')[0];
assert.equal(escaped.imageUrl, null);
assert.equal(escaped.detailUrl, 'https://uletayapp.ru/headliners/a~2Fb~2Ec');
console.log('VK headliners: full current lineup, shared popularity order, ties, no mutation, empty states, URL validation and CMS field preservation passed.');
assert.deepEqual(festivalCountdown('2027-07-07', '2027-07-11', Date.parse('2027-07-05T19:58:57Z')), { state: 'before', days: 1, hours: 0, minutes: 1, seconds: 3 });
assert.equal(festivalCountdown('2027-07-07', '2027-07-11', Date.parse('2027-07-06T20:00:00Z')).state, 'during');
assert.equal(festivalCountdown('2027-07-07', '2027-07-11', Date.parse('2027-07-11T19:59:59Z')).state, 'during');
const finished = festivalCountdown('2027-07-07', '2027-07-11', Date.parse('2027-07-11T20:00:00Z'));
assert.equal(finished.state, 'after');
assert.equal(finished.days + finished.hours + finished.minutes + finished.seconds, 0);
console.log('Countdown: Udmurtia midnight, second precision, festival start/end and nonnegative values passed.');

const communityCards = ['hl-мураками', 'hl-княzz', 'hl-пилот', 'hl-f-p-g', 'hl-план-ломоносова', 'hl-аффинаж', 'hl-стигмата-stigmata', 'hl-чайф', 'hl-молодость-внутри', 'hl-хмыров'].map((id, i) => ({ ...cards[i], id }));
const native = buildCommunityWidget([...communityCards, ...cards.slice(10)], '7–11 июля', 2027);
const payload = JSON.parse(native.code.slice(7, -1));
assert.equal(native.type, 'tiles');
assert.equal(payload.tiles.length, 10, 'Native tiles must use the VK maximum, without exceeding it');
assert.deepEqual(payload.tiles.map((tile: { url: string }) => decodeURIComponent(tile.url.split('#artist=')[1])), communityCards.map(({ id }) => id), 'The native widget preserves the popularity order');
assert.equal(payload.more, 'Все участники · 13 →', 'The footer includes artists beyond the native limit');
assert(payload.tiles.every((tile: { icon_id: string }) => /^club\d+$/.test(tile.icon_id)));
assert.equal(payload.more_url, VK_HEADLINERS_APP_URL);
for (const tile of payload.tiles) {
  assert.equal(new URL(tile.link_url).hostname, 'vk.com');
  assert.equal(new URL(tile.url).pathname, `/app${VK_HEADLINERS_APP_ID}`);
}
assert.equal(buildCommunityWidget(communityCards.slice(0, 2), '7 июля', 2027).type, 'compact_list', 'VK tiles require three items');
const compact = buildCommunityWidget(communityCards, '7 июля', 2027, 'compact_list');
assert.equal(JSON.parse(compact.code.slice(7, -1)).rows.length, 6, 'VK compact lists allow at most six rows');
const unknown = buildCommunityWidget(cards, '7 июля', 2027);
assert.equal(unknown.type, 'compact_list');
assert.equal(JSON.parse(unknown.code.slice(7, -1)).rows.length, 6);
assert(!unknown.code.includes('icon_id'), 'Do not mix unknown and official community portraits');
assert.throws(() => buildCommunityWidget([], '7 июля', 2027));
const hostile = buildCommunityWidget([{ ...communityCards[0], name: '"}; API.wall.post({}); //', musicUrl: 'https://evil.test/', subtitle: '🌞'.repeat(80) }], '7 июля', 2027);
const hostileRow = JSON.parse(hostile.code.slice(7, -1)).rows[0];
assert.equal(hostileRow.title, '"}; API.wall.post({}); //', 'CMS strings stay JSON values');
assert(hostileRow.descr.length <= 100);
assert.equal(new URL(hostileRow.button_url).hostname, 'vk.com');
const countdown = { startDate: '2027-07-07', endDate: '2027-07-11', now: Date.parse('2026-10-19T13:00:00Z') };
assert.equal(communityWidgetTitle('7–11 июля', 2027, countdown), '🔥 Хедлайнеры УЛЕТАЙ · 7–11 июля 2027 · Через 260 дней');
for (const [days, phrase] of [[1, '1 день'], [2, '2 дня'], [5, '5 дней'], [11, '11 дней'], [14, '14 дней'], [21, '21 день'], [22, '22 дня']] as const) {
  assert(communityWidgetTitle('7–11 июля', 2027, { ...countdown, now: Date.parse('2027-07-06T20:00:00Z') - days * 86400000 }).endsWith(`Через ${phrase}`));
}
assert(communityWidgetTitle('7–11 июля', 2027, { ...countdown, now: Date.parse('2027-07-06T19:59:59Z') }).endsWith('Менее суток'));
assert(communityWidgetTitle('7–11 июля', 2027, { ...countdown, now: Date.parse('2027-07-06T20:00:00Z') }).endsWith('Фестиваль идёт'));
assert(communityWidgetTitle('7–11 июля', 2027, { ...countdown, now: Date.parse('2027-07-11T20:00:00Z') }).endsWith('До новых встреч!'));
const countdownWidget = buildCommunityWidget(communityCards, '7–11 июля', 2027, 'tiles', countdown);
assert.equal(JSON.parse(countdownWidget.code.slice(7, -1)).title, communityWidgetTitle('7–11 июля', 2027, countdown));
for (const groupId of [242402250, '242402250']) {
  assert(isHeadlinersTestGroup(groupId), 'Accept both documented string and numeric VK community IDs');
}
for (const groupId of [123, '123', -242402250, '-242402250', null, undefined, {}, [242402250], '242402250junk']) {
  assert(!isHeadlinersTestGroup(groupId), 'A different or malformed community ID must never open the TEST widget preview');
}
assert.equal(widgetSetupContext('', '').visible, false);
assert.equal(widgetSetupContext('', '#setup').inApp, false);
assert.equal(widgetSetupContext('?vk_app_id=1&vk_group_id=242402250&vk_viewer_group_role=admin', '').visible, false);
assert.equal(widgetSetupContext('?vk_app_id=54831337&vk_group_id=242402250&vk_viewer_group_role=admin', '#setup').inApp, false, 'The previous app must not authorize the new installer UI');
assert.equal(widgetSetupContext('?vk_app_id=54834082&vk_group_id=242402250&vk_viewer_group_role=member', '').visible, false);
assert.equal(widgetSetupContext('?vk_app_id=54834082&vk_group_id=242402250&vk_viewer_group_role=admin', '').inTestGroup, true);
console.log('Native VK widget: ten-tile/six-row limits, countdown title, safe VKScript, VK-only links, fallback layout and admin UI context passed.');
