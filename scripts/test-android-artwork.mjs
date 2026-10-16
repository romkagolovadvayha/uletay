import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const project = path.join(root, 'tmp/android-artwork-tests');
await mkdir(path.join(project, 'src/main/java'), { recursive: true });
await mkdir(path.join(project, 'src/test/java'), { recursive: true });
await copyFile(path.join(root, 'patches/expo-audio/NotificationArtworkLoader.kt'), path.join(project, 'src/main/java/NotificationArtworkLoader.kt'));
await copyFile(path.join(root, 'tests/android/NotificationArtworkLoaderTest.kt'), path.join(project, 'src/test/java/NotificationArtworkLoaderTest.kt'));
await writeFile(path.join(project, 'settings.gradle'), `
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement { repositories { google(); mavenCentral() } }
rootProject.name = 'notification-artwork-tests'
`);
await writeFile(path.join(project, 'build.gradle'), `
plugins {
  id 'com.android.library' version '8.13.2'
  id 'org.jetbrains.kotlin.android' version '2.2.0'
}
android {
  namespace 'ru.uletay.artworktest'
  compileSdk 36
  defaultConfig { minSdk 24 }
  compileOptions { sourceCompatibility JavaVersion.VERSION_17; targetCompatibility JavaVersion.VERSION_17 }
  kotlinOptions { jvmTarget = '17' }
  testOptions { unitTests.includeAndroidResources = true }
}
dependencies {
  implementation 'com.github.bumptech.glide:glide:5.0.5'
  implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2'
  testImplementation 'junit:junit:4.13.2'
  testImplementation 'androidx.test:core:1.7.0'
  testImplementation 'org.robolectric:robolectric:4.16'
  testImplementation 'com.squareup.okhttp3:mockwebserver:4.12.0'
}
tasks.withType(Test).configureEach {
  maxHeapSize = '2g'
  testLogging { events 'passed', 'failed'; exceptionFormat 'full' }
}
`);
await writeFile(path.join(project, 'gradle.properties'), 'android.useAndroidX=true\norg.gradle.jvmargs=-Xmx2g\n');
const wrapper = path.join(root, 'android', process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
const result = spawnSync(wrapper, ['-p', project, 'testDebugUnitTest', '--console=plain'], {
  cwd: root, stdio: 'inherit', shell: process.platform === 'win32',
});
process.exit(result.status ?? 1);
