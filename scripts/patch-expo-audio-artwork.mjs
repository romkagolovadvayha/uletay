import { readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const project = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
if (!project.expo?.autolinking?.android?.buildFromSource?.includes('expo-audio')) {
  throw new Error('expo-audio must build from source; its prebuilt AAR does not contain this patch');
}
const audioRoot = path.join(root, 'node_modules/expo-audio');
const audioVersion = JSON.parse(await readFile(path.join(audioRoot, 'package.json'), 'utf8')).version;
if (audioVersion !== '57.0.5') {
  throw new Error(`Review the notification artwork patch for expo-audio ${audioVersion}`);
}

const serviceDirectory = path.join(audioRoot, 'android/src/main/java/expo/modules/audio/service');
const serviceFile = path.join(serviceDirectory, 'AudioControlsService.kt');
const gradleFile = path.join(audioRoot, 'android/build.gradle');
let service = (await readFile(serviceFile, 'utf8')).replaceAll('\r\n', '\n');
let gradle = (await readFile(gradleFile, 'utf8')).replaceAll('\r\n', '\n');
const original = `          val inputStream = url.openConnection().getInputStream()
          val bitmap = BitmapFactory.decodeStream(inputStream)`;
const replacement = '          val bitmap = NotificationArtworkLoader.load(applicationContext, url)';
if (service.includes(original)) {
  service = service.replace(original, replacement).replace('import android.graphics.BitmapFactory\n', '');
} else if (!service.includes(replacement)) {
  throw new Error('expo-audio artwork loader changed; review the patch');
}

// Share the exact Glide version already used by expo-image, without a second loader.
const imageGradle = await readFile(path.join(root, 'node_modules/expo-image/android/build.gradle'), 'utf8');
if (!imageGradle.includes('def GLIDE_VERSION = "5.0.5"')) {
  throw new Error('expo-image Glide version changed; review the artwork dependency');
}
const dependency = "  implementation 'com.github.bumptech.glide:glide:5.0.5'";
if (!gradle.includes(dependency)) {
  if (!gradle.includes('dependencies {\n')) throw new Error('expo-audio dependencies block changed');
  gradle = gradle.replace('dependencies {\n', `dependencies {\n${dependency}\n`);
}

await copyFile(path.join(root, 'patches/expo-audio/NotificationArtworkLoader.kt'), path.join(serviceDirectory, 'NotificationArtworkLoader.kt'));
await writeFile(serviceFile, service);
await writeFile(gradleFile, gradle);
console.log('Patched expo-audio notification artwork: Glide, bounded decode, cancellation and owned bitmap');
