import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { AppData } from '../src/types';
import { createPublicTools, type PublicSnapshot, type PublicTool } from '../src/ai/publicTools';
import { findModelContext, registerWebMcp } from '../src/ai/registerWebMcp';
import { writeAiDiscovery } from './ai-discovery';

async function main() {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  const data: AppData = JSON.parse(readFileSync('cms/seed/content.json', 'utf8'));
  data.festival.startDate = '2027-07-07';
  data.festival.endDate = '2027-07-11';
  data.headliners = [{ id: 'artist/one.', name: 'Ёлка', description: 'Артист', imageTint: '#000', years: [2027, 2026] },
    { id: 'archive', name: 'Архив', description: 'Прошлый год', imageTint: '#000', years: [2026] }];
  data.schedule = [
    { id: 'live/one.', stageId: 'south', date: '2027-07-07', startTime: '23:30', endTime: '00:30', artist: 'Ёлка', headlinerId: 'artist/one.' },
    { id: 'old', stageId: 'south', date: '2026-07-09', startTime: '12:00', endTime: '13:00', artist: 'Архив', headlinerId: 'archive' },
  ];
  data.autographs = [{ ...data.schedule[0], id: 'sign/one.', startTime: '12:00', endTime: '13:00' }];
  data.foodcourt = [{ id: 'food/one.', name: 'Кофе', category: 'drinks', description: 'Горячие напитки',
    location: 'Фудкорт', hours: '09:00–22:00', priceFrom: '100 ₽', distance: '100 м', imageTint: '#000',
    menu: [{ title: 'Напитки', items: [{ name: 'Какао', price: '100 ₽' }] }] }];
  data.mapPois = { type: 'FeatureCollection', features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [53, 56] }, properties: { id: 'water/one.', name: 'Вода', category: 'water' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [53, 56] }, properties: { id: 'restricted', name: 'Служебная', category: 'custom', sourceZoneId: 'restricted' } },
  ] };
  data.mapZones = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [] },
    properties: { id: 'restricted', name: 'Служебная', zoneType: 'service', fillColor: '#000', fillOpacity: 1, accessRestricted: true } }] };
  data.rules = [{ id: 'tickets', label: 'Билеты', blocks: [{ title: 'Вход', paragraphs: ['Сохраните билет'], important: true }] }];
  let snapshot: PublicSnapshot = { data, dataSource: 'remote', lastFetchedAt: Date.now() };
  const original = JSON.stringify(data);
  const tools = createPublicTools(() => snapshot);
  const call = async (name: string, input: unknown = {}) => {
    const result = await tools.find(tool => tool.name === name)!.execute(input) as {
      content: { text: string }[]; structuredContent: { source: { isLive: boolean; dataSource: string }; result: any };
    };
    assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
    return result.structuredContent;
  };

  for (const tool of tools) {
    assert(ajv.validateSchema(tool.inputSchema), `${tool.name}: ${ajv.errorsText()}`);
    assert(ajv.validate(tool.inputSchema, {}));
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.untrustedContentHint, true);
    await call(tool.name);
    await assert.rejects(tool.execute({ unexpected: true }), /Неизвестный/);
    const cancelled = AbortSignal.abort();
    await assert.rejects(tool.execute({}, { signal: cancelled }));
  }
  assert.equal((await call('uletay_find_artists')).result.total, 1, 'archive is not current lineup');
  assert.equal((await call('uletay_find_artists', { query: 'елк' })).result.items[0].name, 'Ёлка');
  assert.equal((await call('uletay_find_artists', { year: 2026, limit: 1 })).result.truncated, true);
  assert.equal((await call('uletay_find_artists', { query: 'absent' })).result.total, 0);
  assert.match((await call('uletay_find_artists')).result.items[0].url, /artist~2Fone~2E$/);
  const events = (await call('uletay_find_events')).result;
  assert.equal(events.total, 1, 'old events excluded');
  assert.match(events.items[0].url, /schedule\/live\/live~2Fone~2E$/);
  assert.equal((await call('uletay_find_events', { stageId: 'west' })).result.total, 0);
  assert.equal((await call('uletay_find_events', { date: '2027-07-08' })).result.total, 0);
  assert.match((await call('uletay_find_events', { kind: 'autograph' })).result.items[0].url, /autographs\/sign~2Fone~2E$/);
  for (const input of [null, [], { query: 'x'.repeat(161) }, { year: 1999 }, { limit: 51 }, { limit: 0 }, { limit: '5' }]) {
    await assert.rejects(call('uletay_find_artists', input));
  }
  for (const input of [{ date: '2027-02-30' }, { kind: 'delete' }, { stageId: 'other' }]) await assert.rejects(call('uletay_find_events', input));
  assert.equal((await call('uletay_find_food', { query: 'какао', category: 'drinks' })).result.total, 1);
  assert.match((await call('uletay_find_food')).result.items[0].url, /foodcourt\/food~2Fone~2E$/);
  assert.equal((await call('uletay_find_map_places')).result.total, 1, 'restricted areas excluded');
  assert.match((await call('uletay_find_map_places')).result.items[0].url, /map\/water~2Fone~2E$/);
  assert.equal((await call('uletay_get_rules', { query: 'билет' })).result.total, 1);
  snapshot = { data: { ...data, festival: { ...data.festival, location: 'Новая площадка' } }, dataSource: 'cache', lastFetchedAt: 0 };
  assert.equal((await call('uletay_get_festival')).result.location, 'Новая площадка', 'callbacks read current snapshot');
  assert.equal((await call('uletay_get_festival')).source.isLive, false, 'cached data identified');
  assert.equal(JSON.stringify(data), original, 'all tools are read-only');

  const registered = new Map<string, PublicTool>();
  const modern = { async registerTool(tool: PublicTool, options?: { signal: AbortSignal }) {
    registered.set(tool.name, tool);
    options?.signal.addEventListener('abort', () => registered.delete(tool.name), { once: true });
  } };
  assert.equal(findModelContext({ modelContext: modern }, {}), modern);
  assert.equal(findModelContext({}, { modelContext: modern }), modern);
  assert.equal(findModelContext({}, {}), undefined);
  const registration = registerWebMcp(modern, () => snapshot);
  assert.equal((await registration.ready).length, 6);
  assert.equal(registered.size, 6);
  registration.dispose();
  assert.equal(registered.size, 0, 'modern AbortSignal cleanup');
  const legacy = { registerTool(tool: PublicTool) { if (registered.has(tool.name)) throw Error('duplicate'); registered.set(tool.name, tool); },
    unregisterTool(name: string) { registered.delete(name); } };
  const first = registerWebMcp(legacy, () => snapshot);
  first.dispose();
  const second = registerWebMcp(legacy, () => snapshot);
  await Promise.all([first.ready, second.ready]);
  assert.equal(registered.size, 6, 'StrictMode mount/unmount remains usable on legacy API');
  second.dispose();
  assert.equal(registered.size, 0);
  assert.equal((await registerWebMcp({ registerTool() { return Promise.reject(Error('blocked')); } }, () => snapshot).ready).length, 0);
  assert.equal((await registerWebMcp(undefined, () => snapshot).ready).length, 0);

  const output = mkdtempSync(path.join(tmpdir(), 'uletay-discovery-'));
  try {
    writeAiDiscovery(data, output);
    const json = JSON.parse(readFileSync(path.join(output, 'ai-catalog.json'), 'utf8'));
    // Validate the fields used here against the current published draft. The
    // browser-tool manifest has its own format, explicitly described in ai-guide.md.
    const catalogSchema = {
      type: 'object', required: ['specVersion', 'entries'], additionalProperties: false,
      properties: {
        specVersion: { const: '1.0' },
        host: { type: 'object', required: ['displayName'], additionalProperties: false,
          properties: { displayName: { type: 'string' }, documentationUrl: { type: 'string', format: 'uri' } } },
        entries: { type: 'array', items: { type: 'object', required: ['identifier', 'type'], additionalProperties: false,
          oneOf: [{ required: ['url'], not: { required: ['data'] } }, { required: ['data'], not: { required: ['url'] } }],
          properties: { identifier: { type: 'string' }, type: { type: 'string' }, displayName: { type: 'string' },
            description: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } },
            url: { type: 'string', format: 'uri' }, data: {} } } },
      },
    };
    assert(ajv.validate(catalogSchema, json), ajv.errorsText());
    assert.equal(json.specVersion, '1.0');
    assert.equal(json.entries.length, 3);
    assert.equal(new Set(json.entries.map((entry: any) => entry.identifier)).size, 3);
    for (const entry of json.entries) {
      assert.equal(Object.hasOwn(entry, 'url'), !Object.hasOwn(entry, 'data'));
      assert.match(entry.identifier, /^urn:air:uletayapp\.ru:/);
      assert.equal(new URL(entry.url).origin, 'https://uletayapp.ru');
      assert(!/admin|secret|token|password/.test(JSON.stringify(entry)));
    }
    assert.deepEqual(JSON.parse(readFileSync(path.join(output, '.well-known/ai-catalog.json'), 'utf8')), json);
    const manifest = JSON.parse(readFileSync(path.join(output, 'webmcp.json'), 'utf8'));
    assert.deepEqual(manifest.tools.map((tool: any) => tool.name), tools.map(tool => tool.name));
    assert(!readFileSync(path.join(output, 'webmcp.json'), 'utf8').includes('execute'));
    const llms = readFileSync(path.join(output, 'llms.txt'), 'utf8');
    assert.match(llms, /^# .+\n\n> /);
    assert.equal([...llms.matchAll(/^# /gm)].length, 1);
    assert(!/^#{3,} /m.test(llms));
    for (const section of llms.split(/^## .+$/m).slice(1)) {
      for (const line of section.split('\n').filter(line => line.trim())) assert.match(line, /^- \[[^\]]+\]\(https:\/\//);
    }
    assert(!llms.includes('${'));
    for (const [, link] of llms.matchAll(/\]\(([^)]+)\)/g)) assert.equal(new URL(link).origin, 'https://uletayapp.ru');
    const updated = { ...data, festival: { ...data.festival, year: 2028 } };
    writeAiDiscovery(updated, output);
    assert.match(readFileSync(path.join(output, 'llms.txt'), 'utf8'), /headliners\/2028/);
  } finally { rmSync(output, { recursive: true, force: true }); }
  console.log('AI discovery: 6 public tools, validation, freshness, archive dates, URLs, lifecycle and catalog generation passed.');
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
