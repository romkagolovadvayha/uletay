import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildAdminSearch,
  adminHref,
  adminSaveRedirect,
  matchesAdminSearch,
} from '../src/lib/admin-navigation';
import { parseFoodcourtMenu } from '../src/lib/foodcourt-menu-input';
import type { AppData } from '../src/types';

const seed = JSON.parse(
  readFileSync(new URL('../seed/content.json', import.meta.url), 'utf8'),
) as AppData;
assert(matchesAdminSearch('  гарик сукачев ', 'ГАРИК СУКАЧЁВ'));
assert(matchesAdminSearch('  ария 2026', 'АРИЯ', 'Выступление · 2026-07-11'));
assert(!matchesAdminSearch('ария 2027', 'АРИЯ', '2026-07-11'));
assert(matchesAdminSearch('', 'Любая запись'));
const index = buildAdminSearch(seed);
assert.equal(
  new URL(
    adminSaveRedirect('headliners', '/admin?tab=headliners&q=Ария&year=2026&edit=stale'),
    'https://admin.invalid',
  ).searchParams.get('q'),
  'Ария',
);
for (const target of [
  'https://other.test/admin?tab=headliners',
  '//other.test/admin?tab=headliners',
  '/api/data?tab=headliners',
  '/admin?tab=foodcourt',
]) {
  assert.equal(adminSaveRedirect('headliners', target), '/admin?tab=headliners&ok=1');
}
assert(!adminSaveRedirect('headliners', '/admin?tab=headliners&edit=stale').includes('edit='));
assert.equal(
  new Set(index.map((item) => item.href)).size,
  index.length,
  'Search targets must be unique',
);
for (const tab of ['headliners', 'schedule', 'autographs', 'foodcourt'] as const) {
  for (const item of seed[tab]) {
    const match = index.find((entry) => entry.href === adminHref(tab, { edit: item.id }));
    assert(match, `${tab}/${item.id} must be reachable from search`);
    assert.equal(
      new URL(match.href, 'https://uletayapp.ru').searchParams.get('edit'),
      item.id,
      'Cyrillic and special characters survive navigation',
    );
  }
}
const valid = [
  {
    title: ' Напитки ',
    items: [{ name: ' Лимонад ', price: '200 ₽', portion: '300 мл', description: 'Без сахара' }],
  },
];
const parsed = parseFoodcourtMenu(JSON.stringify(valid));
assert.equal(parsed[0].title, 'Напитки');
assert.equal(parsed[0].items[0].name, 'Лимонад');
assert.equal(parsed[0].items[0].price, '200 ₽');
assert.deepEqual(parseFoodcourtMenu('[]'), [], 'Empty menu explicitly removes all sections');
for (const invalid of [
  'null',
  '{}',
  '{',
  '[null]',
  JSON.stringify([{ title: 'Раздел', items: [] }]),
  JSON.stringify([{ title: 'Раздел', items: [{ name: '', price: '100' }] }]),
  JSON.stringify([{ title: 'Раздел', items: [{ name: 'Блюдо', price: 100 }] }]),
  JSON.stringify(Array(31).fill(valid[0])),
]) {
  assert.throws(() => parseFoodcourtMenu(invalid));
}
assert.throws(() => parseFoodcourtMenu(' '.repeat(100_001)));
for (const vendor of seed.foodcourt) {
  if (vendor.menu?.length) {
    const menu = parseFoodcourtMenu(JSON.stringify(vendor.menu));
    assert.equal(menu.length, vendor.menu.length);
    assert.equal(
      menu.flatMap((section) => section.items).length,
      vendor.menu.flatMap((section) => section.items).length,
    );
  }
}
console.log(
  `Admin workspace: ${index.length} navigation targets, Russian search and menu validation passed.`,
);
