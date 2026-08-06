/**
 * After expo export: drop production bloat that Metro copies but the app never loads.
 * - Source maps (~6 MB) unless EXPO_KEEP_SOURCE_MAPS=1
 * - Unused vector-icon / Montserrat TTF families (~8 MB); keep Ionicons + 400/600/700
 */
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, process.env.DIST_DIR ?? 'dist');
const flattenedFontsDir = join(distDir, 'assets', 'fonts');
const keepSourceMaps = process.env.EXPO_KEEP_SOURCE_MAPS === '1';

const KEEP_FONT_PATTERNS = [
  /^Ionicons(\.|$)/i,
  /^Montserrat_400Regular\./i,
  /^Montserrat_600SemiBold\./i,
  /^Montserrat_700Bold\./i,
];

function walk(dir, files = []) {
  if (!existsSync(dir)) {
    return files;
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

function shouldKeepFont(filename) {
  return KEEP_FONT_PATTERNS.some((pattern) => pattern.test(filename));
}

if (!existsSync(distDir)) {
  console.error('prune-dist-assets: dist/ missing');
  process.exit(1);
}

let removedMaps = 0;
let removedFonts = 0;
let freedBytes = 0;

for (const file of walk(distDir)) {
  const name = file.split(/[/\\]/).pop() ?? '';
  const size = statSync(file).size;

  if (!keepSourceMaps && name.endsWith('.js.map')) {
    rmSync(file, { force: true });
    removedMaps += 1;
    freedBytes += size;
    continue;
  }

  // flatten-web-font-assets rewrites the bundle to assets/fonts/*.ttf. Remove
  // every nested Metro copy too, including duplicate copies of retained fonts.
  const isRetainedFlattenedFont =
    name.endsWith('.ttf') && dirname(file) === flattenedFontsDir && shouldKeepFont(name);
  if (name.endsWith('.ttf') && !isRetainedFlattenedFont) {
    rmSync(file, { force: true });
    removedFonts += 1;
    freedBytes += size;
  }
}

console.log(
  `prune-dist-assets: removed ${removedMaps} source maps, ${removedFonts} unused or duplicate fonts (~${(freedBytes / (1024 * 1024)).toFixed(1)} MiB) from ${relative(root, distDir)}`,
);
