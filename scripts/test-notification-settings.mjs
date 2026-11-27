import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

function load(file, imports) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, console, require(name) {
    if (name in imports) return imports[name];
    if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name + '.ts'), imports);
    throw Error('Unexpected import ' + name);
  } }, { filename: file });
  return module.exports;
}

function settingsScenario({ granted = true } = {}) {
  const calls = [];
  let finishRegister;
  const registration = new Promise(resolve => { finishRegister = resolve; });
  const imports = {
    react: React,
    'react-native': { AppState: { addEventListener: () => ({ remove() {} }) } },
    '../utils/favoriteNotifications': {
      loadNotificationsEnabled: async () => false,
      getNotificationPermissionStatus: async () => granted ? 'granted' : 'denied',
      requestNotificationPermissions: async () => granted,
      saveNotificationsEnabled: async value => { calls.push(['save', value]); },
      cancelAllFavoriteNotifications: async () => { calls.push(['clear-reminders']); },
    },
    '../utils/remotePushNotifications': {
      syncRemotePushSubscription: () => { calls.push(['register']); return registration; },
      unregisterRemotePushSubscription: () => { calls.push(['unregister']); return registration; },
      addRemotePushTokenRefreshListener: () => null,
    },
    '../utils/festivalActivity': { syncFestivalActivities: async events => { calls.push(['activity', events.length]); } },
  };
  const api = load(path.resolve('src/context/NotificationSettingsContext.tsx'), imports);
  let settings;
  function Probe() { settings = api.useNotificationSettings(); return null; }
  renderToStaticMarkup(React.createElement(api.NotificationSettingsProvider, null, React.createElement(Probe)));
  return { settings, calls, finishRegister };
}

const flush = async () => { for (let i = 0; i < 12; i++) await new Promise(resolve => setImmediate(resolve)); };
const failures = [];
async function check(name, test) { try { await test(); console.log('PASS ' + name); } catch (error) { failures.push(error); console.error('FAIL ' + name + ': ' + error.message); } }

await check('local opt-in finishes while the push server is unresponsive', async () => {
  const s = settingsScenario();
  let result;
  const enabling = s.settings.enableNotifications().then(value => { result = value; });
  await flush();
  assert.equal(result, true, 'Local reminders and Live Activity must not wait for remote push registration');
  assert(s.calls.some(([action, value]) => action === 'save' && value === true));
  s.finishRegister(); await enabling;
});
await check('opt-out clears the activity and reminders without waiting for network', async () => {
  const s = settingsScenario();
  let complete = false;
  const disabling = s.settings.disableNotifications().then(() => { complete = true; });
  await flush();
  assert(s.calls.some(([action, value]) => action === 'save' && value === false));
  assert(s.calls.some(([action, count]) => action === 'activity' && count === 0));
  assert(s.calls.some(([action]) => action === 'clear-reminders'));
  assert.equal(complete, true, 'Disabling local features must not wait for the push server');
  s.finishRegister(); await disabling;
});
await check('denied permission never enables notifications or registers a token', async () => {
  const s = settingsScenario({ granted: false });
  assert.equal(await s.settings.enableNotifications(), false);
  assert.equal(s.calls.length, 0);
});
await check('Android creates a channel before requesting notification permission', async () => {
  const calls = [];
  const notifications = {
    AndroidImportance: { HIGH: 4 }, IosAuthorizationStatus: { PROVISIONAL: 3 },
    setNotificationChannelAsync: async id => { calls.push('channel:' + id); },
    getPermissionsAsync: async () => ({ granted: false, canAskAgain: true }),
    requestPermissionsAsync: async () => {
      assert(calls.includes('channel:broadcasts'), 'Android 13+ needs a notification channel before the permission prompt');
      calls.push('permission'); return { granted: true };
    },
  };
  const api = load(path.resolve('src/utils/favoriteNotifications.ts'), {
    '@react-native-async-storage/async-storage': {},
    'react-native': { Platform: { OS: 'android' } }, 'expo-notifications': notifications,
    './webNotifications': {}, './scheduleHelpers': {},
  });
  assert.equal(await api.requestNotificationPermissions(), true);
  assert.deepEqual(calls, ['channel:broadcasts', 'permission']);
});
if (failures.length) process.exitCode = 1;
