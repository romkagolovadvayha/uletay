import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { withBuildProperties } = require('expo-build-properties');
const withRuStorePush = require('../plugins/with-rustore-push');
const sdkManifest = await readFile(require.resolve('react-native-rustore-push/android/src/main/AndroidManifest.xml'), 'utf8');
const paramsClass = sdkManifest.match(/android:name="ru\.rustore\.sdk\.pushclient\.params_class"\s+android:value="([^"]+)"/)?.[1];
assert(paramsClass, 'RuStore SDK must declare its reflection-loaded initializer');
const sdkGradle = await readFile(require.resolve('react-native-rustore-push/android/build.gradle'), 'utf8');
assert(sdkGradle.includes('https://nexus-external.rustore.ru/repository/maven-rustore-exposed'), 'RuStore dependencies must use the current official Maven repository');
assert(!sdkGradle.includes('artifactory-external.vkpartner.ru'), 'The retired RuStore Maven repository must not remain in the SDK');
for (const module of ['tracer-manifest', 'tracer-lite-crash-report']) {
  assert(sdkGradle.includes(`implementation "ru.ok.tracer:${module}:1.0.4"`), 'RuStore Tracer dependencies must resolve from Maven Central');
}

const temporaryRoot = path.resolve(os.tmpdir());
const projectRoot = await mkdtemp(path.join(temporaryRoot, 'uletay-rustore-prebuild-'));
const platformProjectRoot = path.join(projectRoot, 'android');
const rulesPath = path.join(platformProjectRoot, 'app', 'proguard-rules.pro');
try {
  await mkdir(path.dirname(rulesPath), { recursive: true });
  await writeFile(rulesPath, '# Existing application rules\n-keep class example.ApplicationRule { *; }\n');
  let manifest = { manifest: { application: [{ $: { 'android:name': '.MainApplication' } }] } };
  let firstRules;
  // Exercise the same mod chain twice: custom plugin rules must survive the
  // build-properties purge step, coexist with app rules and remain idempotent.
  for (let pass = 0; pass < 2; pass += 1) {
    let config = withBuildProperties({ name: 'QA', slug: 'qa' }, {
      android: { enableMinifyInReleaseBuilds: true, extraProguardRules: '-keep class example.OtherPlugin { *; }' },
    });
    config = withRuStorePush(config, { projectId: 'qa-project', channelId: 'broadcasts' });
    const modRequest = { projectRoot, platformProjectRoot, platformName: 'android' };
    await config.mods.android.dangerous({ ...config, modRequest, modResults: null });
    const result = await config.mods.android.manifest({ ...config, modRequest, modResults: manifest });
    manifest = result.modResults;
    const rules = await readFile(rulesPath, 'utf8');
    assert(rules.includes(`-keep class ${paramsClass} { *; }`), 'R8 must retain the class named in the installed SDK manifest and its Context constructor');
    assert(rules.includes('example.ApplicationRule') && rules.includes('example.OtherPlugin'));
    if (pass === 0) firstRules = rules;
    else assert.equal(rules, firstRules, 'Repeated prebuild must not duplicate or discard rules');
    const entries = manifest.manifest.application[0]['meta-data'];
    for (const [name, value] of [['project_id', 'qa-project'], ['default_notification_channel_id', 'broadcasts']]) {
      const matching = entries.filter(item => item.$['android:name'] === `ru.rustore.sdk.pushclient.${name}`);
      assert.equal(matching.length, 1);
      assert.equal(matching[0].$['android:value'], value);
    }
  }
  console.log(`PASS: RuStore initializer ${paramsClass} retained by prebuild; existing rules and manifest settings preserved.`);
} finally {
  assert(projectRoot.startsWith(temporaryRoot + path.sep) && path.basename(projectRoot).startsWith('uletay-rustore-prebuild-'));
  await rm(projectRoot, { recursive: true, force: true });
}
