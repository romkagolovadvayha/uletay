import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the real registration module. The native mock reproduces Android's
// event on every token read, which previously caused an endless request loop.
const storage = new Map();
const listeners = new Set();
const posts = [];
const operations = [];
let nativeReads = 0;
let offline = false;
let holdNextPost;
const emit = (data) => { for (const listener of listeners) listener({type: 'android', data}); };
const notifications = {
  AndroidImportance: {HIGH: 4},
  setNotificationChannelAsync: async () => {},
  addPushTokenListener: (listener) => {listeners.add(listener); return {remove: () => listeners.delete(listener)};},
  getExpoPushTokenAsync: async ({devicePushToken}) => {
    if (!devicePushToken) {
      assert(++nativeReads < 5, 'Push refresh must not recursively request the native token');
      devicePushToken = {type: 'android', data: 'native-first'};
      emit(devicePushToken.data);
    }
    return {data: `Expo[${devicePushToken.data}]`};
  },
};
const imports = {
  '@react-native-async-storage/async-storage': {getItem: async key => storage.get(key), setItem: async (key, value) => storage.set(key, value), removeItem: async key => storage.delete(key)},
  'expo-constants': {expoConfig: {android: {googleServicesFile: './firebase.json'}, extra: {eas: {projectId: 'project'}}}},
  'expo-notifications': notifications,
  'react-native': {Platform: {OS: 'android'}},
  '../api/apiFetch': {apiFetch: async (_path, init) => {
    if (offline) throw Error('offline');
    const body = JSON.parse(init.body);
    posts.push(body); operations.push({method: init.method, ...body});
    const gate = holdNextPost; holdNextPost = null;
    if (gate) await gate;
    return {ok: true};
  }},
  './rustorePushNotifications': {isRuStorePushBuild: () => false},
};
function load(file) {
  const module = {exports: {}};
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true}}).outputText;
  vm.runInNewContext(compiled, {module, exports: module.exports, require: name => {
    if (name === './notificationChannels') return load('src/utils/notificationChannels.ts');
    assert(name in imports, `Unexpected import ${name}`); return imports[name];
  }});
  return module.exports;
}
const api = load('src/utils/remotePushNotifications.ts');
const flush = async () => {for (let i = 0; i < 10; i++) await new Promise(resolve => setImmediate(resolve));};
const subscription = api.addRemotePushTokenRefreshListener();
await api.syncRemotePushSubscription();
await flush();
assert.equal(nativeReads, 1, 'Initial registration reads the device token only once');
assert.equal(posts.length, 2, 'The initial native event must settle, not recurse');
emit('native-rotated');
await flush();
assert.equal(nativeReads, 1, 'Token rotation must reuse the token supplied by Android');
assert.equal(posts.at(-1).token, 'Expo[native-rotated]');
assert.equal(storage.get('@uletay_expo_push_token'), 'Expo[native-rotated]');
offline = true;
emit('native-offline');
await flush();
assert.equal(storage.get('@uletay_expo_push_token'), 'Expo[native-rotated]', 'Failed registration preserves the working token');
offline = false;
emit('native-recovered');
await flush();
assert.equal(storage.get('@uletay_expo_push_token'), 'Expo[native-recovered]');
subscription.remove();
emit('native-removed');
await flush();
assert.equal(posts.length, 4, 'Removing the listener must stop refresh registrations');

let finishRegistration;
holdNextPost = new Promise(resolve => { finishRegistration = resolve; });
const registering = api.syncRemotePushSubscription();
await flush();
const pendingToken = operations.at(-1).token;
assert.equal(operations.at(-1).method, 'POST');
const unregistering = api.unregisterRemotePushSubscription();
await flush();
assert.equal(operations.at(-1).method, 'POST', 'Opt-out must wait for the in-flight registration before removing its token');
finishRegistration();
await Promise.all([registering, unregistering]);
assert.equal(operations.at(-1).method, 'DELETE');
assert.equal(operations.at(-1).token, pendingToken, 'Opt-out removes the token produced by the late registration');
assert.equal(storage.has('@uletay_expo_push_token'), false);

const queuedListener = api.addRemotePushTokenRefreshListener();
holdNextPost = new Promise(resolve => { finishRegistration = resolve; });
const secondRegistration = api.syncRemotePushSubscription();
await flush();
emit('native-queued-after-disable');
queuedListener.remove();
const finalOptOut = api.unregisterRemotePushSubscription();
finishRegistration();
await Promise.all([secondRegistration, finalOptOut]);
await flush();
assert.equal(operations.some(row => row.token === 'Expo[native-queued-after-disable]'), false, 'A removed listener must not register an already queued token');
assert.equal(storage.has('@uletay_expo_push_token'), false);
console.log('Native push: token refresh, offline recovery, late registration opt-out and queued listener cancellation passed.');
