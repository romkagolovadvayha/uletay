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
