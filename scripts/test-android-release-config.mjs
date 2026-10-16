import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const require = createRequire(import.meta.url);
const withOptimization = require('../plugins/with-android-release-optimization');
const app = JSON.parse(await readFile(new URL('../app.json', import.meta.url), 'utf8')).expo;
assert(app.plugins.includes('./plugins/with-android-release-optimization'));
assert(app.plugins.includes('expo-system-ui'), 'Apply the dark root view behind transparent system bars');
const autolinker = path.join(path.dirname(require.resolve('expo-modules-autolinking/package.json')), 'bin/expo-modules-autolinking.js');
const linked = JSON.parse(execFileSync(process.execPath, [autolinker, 'resolve', '--platform', 'android', '--json'], { encoding: 'utf8' }));
assert(linked.configuration.buildFromSource.includes('expo-audio'), 'Compile the patched expo-audio sources instead of its original prebuilt AAR');
assert(linked.modules.some(module => module.packageName === 'expo-audio' && module.projects.some(project => project.name === 'expo-audio')));

let project = { language: 'groovy', contents: "dependencies { classpath('com.android.tools.build:gradle') }" };
let application = {
  language: 'groovy',
  contents: 'proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"',
};
let properties = [
  { type: 'property', key: 'android.enableR8.fullMode', value: 'false' },
  { type: 'property', key: 'edgeToEdgeEnabled', value: 'false' },
  { type: 'property', key: 'custom.setting', value: 'preserved' },
];
let previous;
for (let pass = 0; pass < 2; pass += 1) {
  const config = withOptimization({ name: 'QA', slug: 'qa' });
  for (const [name, input, assign] of [
    ['projectBuildGradle', project, (value) => { project = value; }],
    ['appBuildGradle', application, (value) => { application = value; }],
    ['gradleProperties', properties, (value) => { properties = value; }],
  ]) {
    assign((await config.mods.android[name]({
      ...config, modRequest: { platformName: 'android' }, modResults: input,
    })).modResults);
  }
  assert(project.contents.includes('com.android.tools.build:gradle:8.13.2'));
  assert(application.contents.includes('proguard-android-optimize.txt'));
  assert(!application.contents.includes('"proguard-android.txt"'));
  assert(application.contents.includes('"proguard-rules.pro"'), 'Preserve application keep rules');
  for (const key of [
    'edgeToEdgeEnabled', 'android.enableR8.fullMode',
    'android.enableMinifyInReleaseBuilds', 'android.enableShrinkResourcesInReleaseBuilds',
    'android.r8.optimizedResourceShrinking',
  ]) {
    const matching = properties.filter((item) => item.key === key);
    assert.equal(matching.length, 1, `Exactly one ${key} property`);
    assert.equal(matching[0].value, 'true', key);
  }
  assert(properties.some((item) => item.key === 'custom.setting' && item.value === 'preserved'));
  const state = JSON.stringify({ project, application, properties });
  if (previous) assert.equal(state, previous, 'Repeated prebuild is idempotent');
  previous = state;
}
const invalid = withOptimization({ name: 'QA', slug: 'qa' });
await assert.rejects(() => invalid.mods.android.appBuildGradle({
  ...invalid,
  modRequest: { platformName: 'android' },
  modResults: { language: 'groovy', contents: 'unexpected future template' },
}), /Optimized ProGuard configuration not found/);
console.log('PASS: release prebuild enables R8 optimization, optimized resource shrinking and edge-to-edge; preserves app rules and is idempotent.');
