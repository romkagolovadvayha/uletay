import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { encodeSeoRouteId } from '../src/seo/seoRouteUtils.ts';

const result = await build({
  entryPoints: ['src/navigation/linking.ts'], bundle: true, platform: 'node', format: 'cjs', write: false,
  plugins: [{ name: 'web-platform', setup(builder) {
    const modules = {
      '@react-navigation/native': 'export { getStateFromPath, getPathFromState } from "@react-navigation/core";',
      'react-native': 'export const Platform = { OS: "web" };',
      'expo-linking': 'export const createURL = (path) => "https://uletayapp.ru" + path; export const getInitialURL = async () => null; export const addEventListener = () => ({ remove() {} });',
      'expo-notifications': 'export const getLastNotificationResponse = () => null; export const clearLastNotificationResponse = () => {}; export const addNotificationResponseReceivedListener = () => ({ remove() {} });',
      '../utils/rustorePushNotifications': 'export const addRuStorePushOpenedListener = () => null; export const getInitialRuStorePushPath = async () => null;',
    };
    builder.onResolve({ filter: /.*/ }, ({ path }) => path in modules ? { path, namespace: 'web-platform' } : undefined);
    builder.onLoad({ filter: /.*/, namespace: 'web-platform' }, ({ path }) => ({ contents: modules[path], resolveDir: process.cwd() }));
  } }],
});
const module = { exports: {} };
new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { linking, setHeadlinersInMoreTab } = module.exports;
let checks = 0;
for (const inMore of [true, false]) {
  setHeadlinersInMoreTab(inMore);
  for (const id of ['hl-чайф', 'hl-ЧИЖ & CO', 'hl-F.P.G.', 'artist/with~escape', 'artist?name#part']) {
    const path = '/headliners/' + encodeURIComponent(encodeSeoRouteId(id));
    for (const suffix of ['', '/', '?utm_source=refresh', '/?utm_source=refresh', '#tracks']) {
      const state = linking.getStateFromPath(path + suffix, linking.config);
      assert.equal(state.routes[0].name, inMore ? 'MoreTab' : 'HeadlinersTab');
      assert.equal(state.routes[0].state.routes[0].params.headlinerId, id, path + suffix);
      assert.equal(linking.getPathFromState(state, linking.config), path);
      checks++;
    }
  }
  for (const suffix of ['', '/', '?utm_source=refresh', '/?utm_source=refresh', '#list']) {
    const state = linking.getStateFromPath('/headliners' + suffix, linking.config);
    assert.equal(state.routes[0].state.routes[0].name, 'HeadlinersMain');
    assert.equal(linking.getStateFromPath('/more' + suffix, linking.config).routes[0].name, 'HomeTab');
    checks += 2;
  }
}
console.log(`test-web-linking: ${checks} route round trips passed`);
