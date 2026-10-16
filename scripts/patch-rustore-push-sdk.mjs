import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modulePath = path.join(
  rootDir,
  'node_modules',
  'react-native-rustore-push',
  'android',
  'src',
  'main',
  'java',
  'com',
  'rustorepush',
  'RustorePushModule.kt',
);

const source = await readFile(modulePath, 'utf8');
const oldSignature = 'override fun onNewIntent(intent: Intent?) {';
const newSignature = 'override fun onNewIntent(intent: Intent) {';

if (source.includes(oldSignature)) {
  await writeFile(modulePath, source.replace(oldSignature, newSignature), 'utf8');
  console.log('Patched RuStore Push SDK for React Native 0.86 onNewIntent signature');
} else if (!source.includes(newSignature)) {
  throw new Error(
    'RuStore Push SDK onNewIntent signature changed; review the compatibility patch',
  );
}

// RuStore retired its VK Partner Artifactory on 30 September 2026. The SDK
// still declares that repository, so point Gradle at its official replacement.
const gradlePath = path.join(rootDir, 'node_modules', 'react-native-rustore-push', 'android', 'build.gradle');
const gradle = await readFile(gradlePath, 'utf8');
const retiredRepositories = [
  'https://artifactory-external.vkpartner.ru/artifactory/maven-rustore-exposed',
  'https://artifactory-external.vkpartner.ru/artifactory/maven',
];
const repository = 'https://nexus-external.rustore.ru/repository/maven-rustore-exposed';
let patchedGradle = gradle;
for (const retired of retiredRepositories) {
  patchedGradle = patchedGradle.replaceAll(retired, repository);
}
if (!patchedGradle.includes(repository)) {
  throw new Error('RuStore Push SDK Maven repository changed; review the compatibility patch');
}
if (patchedGradle !== gradle) {
  await writeFile(gradlePath, patchedGradle, 'utf8');
  console.log('Updated RuStore Push SDK Maven repository');
}

// Tracer 1.0.1 was only available from the retired repository. Version 1.0.4
// is the first Maven Central release in the same API series. Explicit direct
// dependencies let Gradle select it over Push SDK 6.9.1's transitive 1.0.1.
const tracerMarker = '// Tracer Maven Central compatibility';
const tracerDependencies = [
  'implementation "ru.ok.tracer:tracer-manifest:1.0.4"',
  'implementation "ru.ok.tracer:tracer-lite-crash-report:1.0.4"',
];
if (!patchedGradle.includes(tracerMarker)) {
  patchedGradle += `\n${tracerMarker}\ndependencies {\n  ${tracerDependencies.join('\n  ')}\n}\n`;
  await writeFile(gradlePath, patchedGradle, 'utf8');
  console.log('Pinned RuStore Tracer dependencies to Maven Central release 1.0.4');
} else if (!tracerDependencies.every(line => patchedGradle.includes(line))) {
  throw new Error('RuStore Tracer compatibility dependencies changed; review the patch');
}
