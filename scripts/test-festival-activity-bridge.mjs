import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function bridge(os, native) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync('src/utils/festivalActivity.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const imports = { 'react-native': { Platform: { OS: os } }, expo: { requireOptionalNativeModule: () => native }, '../config/api': { API_BASE_URL: 'https://uletayapp.ru/api' } };
  vm.runInNewContext(output, { module, exports: module.exports, require: name => { assert(name in imports); return imports[name]; } });
  return module.exports;
}
const event = { id: 'perf:one', artist: 'Артист', stage: 'Сцена', kind: 'performance', startAt: 1, endAt: 2, timeLabel: '18:00–19:00', url: '/schedule/live/one' };
const calls = [];
const modern = bridge('ios', { syncEvents: async () => { throw Error('Legacy path used'); }, syncState: async value => { calls.push(['local', JSON.parse(value)]); }, configurePush: async (url, enabled) => { calls.push(['push', url, enabled]); } });
await modern.syncFestivalActivities([event], { enabled: true, favoriteKeys: ['perf:one'], authoritative: false });
assert.equal(calls[0][0], 'local'); assert.equal(calls[0][1].authoritative, false);
assert.equal(calls[1][0], 'push'); assert.equal(calls[1][2], true);
await modern.syncFestivalActivities([]);
assert.equal(calls.at(-1)[2], false, 'Opt-out must disable native APNs registration');
const legacyCalls = [];
await bridge('ios', { syncEvents: async json => { legacyCalls.push(JSON.parse(json)); } }).syncFestivalActivities([event]);
assert.equal(legacyCalls[0][0].id, event.id, 'Installed pre-APNs builds must retain local activities');
await bridge('android', { syncEvents: async json => { legacyCalls.push(JSON.parse(json)); }, configurePush: async () => { throw Error('Android must not register APNs'); } }).syncFestivalActivities([event]);
assert.equal(legacyCalls.length, 2);
await bridge('web', null).syncFestivalActivities([event]);
let unblock;
const gate = new Promise(resolve => { unblock = resolve; });
const order = [];
const sequential = bridge('ios', { syncEvents: async json => { if (JSON.parse(json).length) await gate; order.push(JSON.parse(json).length); } });
const first = sequential.syncFestivalActivities([event]);
const last = sequential.syncFestivalActivities([]);
await new Promise(resolve => setImmediate(resolve)); assert.deepEqual(order, []);
unblock(); await Promise.all([first, last]); assert.deepEqual(order, [1, 0], 'A late native start must finish before opt-out clears it');
console.log('PASS: local-first iOS bridge, cache freshness, APNs opt-out, legacy builds, Android/web isolation and native serialization');
