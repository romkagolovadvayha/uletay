import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

// Test the production receiver/store on a device without packaging the unrelated RN runtime.
const root = path.resolve(import.meta.dirname, '..');
const project = path.join(root, 'tmp/festival-activity-android-tests');
const moduleRoot = path.join(root, 'modules/festival-activity/android');
for (const dir of ['src/main/java/expo/modules/festivalactivity', 'src/main/res/drawable', 'src/androidTest/java/expo/modules/festivalactivity']) {
  await mkdir(path.join(project, dir), { recursive: true });
}
for (const file of [
  'src/main/AndroidManifest.xml',
  'src/main/java/expo/modules/festivalactivity/FestivalActivityStore.kt',
  'src/main/java/expo/modules/festivalactivity/FestivalActivityReceiver.kt',
  'src/main/res/drawable/ic_festival_activity.xml',
  'src/androidTest/java/expo/modules/festivalactivity/FestivalActivityTest.kt',
]) await copyFile(path.join(moduleRoot, file), path.join(project, file));
await writeFile(path.join(project, 'settings.gradle'), `
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement { repositories { google(); mavenCentral() } }
rootProject.name = 'festival-activity-tests'
`);
await writeFile(path.join(project, 'build.gradle'), `
plugins {
  id 'com.android.library' version '8.13.2'
  id 'org.jetbrains.kotlin.android' version '2.2.0'
}
android {
  namespace 'expo.modules.festivalactivity'
  compileSdk 36
  defaultConfig { minSdk 24; testInstrumentationRunner 'androidx.test.runner.AndroidJUnitRunner' }
  compileOptions { sourceCompatibility JavaVersion.VERSION_17; targetCompatibility JavaVersion.VERSION_17 }
  kotlinOptions { jvmTarget = '17' }
}
dependencies {
  implementation 'androidx.core:core:1.17.0'
  androidTestImplementation 'androidx.test:runner:1.7.0'
  androidTestImplementation 'androidx.test.ext:junit:1.3.0'
}
`);
await writeFile(path.join(project, 'gradle.properties'), 'android.useAndroidX=true\norg.gradle.jvmargs=-Xmx512m -XX:MaxMetaspaceSize=256m\nkotlin.compiler.execution.strategy=in-process\n');
const wrapper = path.join(root, 'android', process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
const task = process.argv.includes('--assemble-only') ? 'assembleDebugAndroidTest' : 'connectedDebugAndroidTest';
const result = spawn(wrapper, ['-p', project, task, '--console=plain', '--max-workers=1', '--no-daemon'], {
  cwd: root, stdio: 'inherit', shell: process.platform === 'win32', windowsHide: true,
});
result.on('error', error => { console.error(error.message); process.exitCode = 1; });
result.on('exit', code => { process.exitCode = code ?? 1; });
