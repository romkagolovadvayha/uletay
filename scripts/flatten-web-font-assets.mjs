import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, process.env.DIST_DIR ?? 'dist');
const bundleDir = path.join(distDir, '_expo', 'static', 'js', 'web');
const fontsDir = path.join(distDir, 'assets', 'fonts');

const sources = {
  Montserrat_400Regular: path.join(root, 'node_modules', '@expo-google-fonts', 'montserrat', '400Regular', 'Montserrat_400Regular.ttf'),
  Montserrat_600SemiBold: path.join(root, 'node_modules', '@expo-google-fonts', 'montserrat', '600SemiBold', 'Montserrat_600SemiBold.ttf'),
  Montserrat_700Bold: path.join(root, 'node_modules', '@expo-google-fonts', 'montserrat', '700Bold', 'Montserrat_700Bold.ttf'),
  Ionicons: path.join(root, 'node_modules', '@expo', 'vector-icons', 'build', 'vendor', 'react-native-vector-icons', 'Fonts', 'Ionicons.ttf'),
};

if (!existsSync(bundleDir)) {
  throw new Error(`Web bundles not found in ${bundleDir}`);
}

mkdirSync(fontsDir, { recursive: true });
const copied = new Set();

for (const entry of readdirSync(bundleDir, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
  const file = path.join(bundleDir, entry.name);
  let code = readFileSync(file, 'utf8');

  code = code.replace(
    /\/assets\/[^"']*\/(Montserrat_400Regular|Montserrat_600SemiBold|Montserrat_700Bold|Ionicons)(\.[a-f0-9]+\.ttf)/g,
    (_match, family, suffix) => {
      const filename = `${family}${suffix}`;
      if (!copied.has(filename)) {
        copyFileSync(sources[family], path.join(fontsDir, filename));
        copied.add(filename);
      }
      return `/assets/fonts/${filename}`;
    },
  );

  writeFileSync(file, code, 'utf8');
}

console.log(`flatten-web-font-assets: copied and rewrote ${copied.size} fonts`);
