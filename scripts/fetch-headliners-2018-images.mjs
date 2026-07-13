/**
 * Fetch artist images for 2018 headliners missing from fest-artist-sources.
 */
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const sourcesPath = join(root, 'scripts', 'fest-artist-sources.json');

const artists = [
  'NOIZE MC',
  'LOUNA',
  'ТЕНИ СВОБОДЫ',
  'СМЕХ',
  'ЭЛИЗИУМ',
  'НАИВ',
  'АГАТА КРИСТИ',
  'СКВОРЦЫ СТЕПАНОВА',
  'ANACONDAZ',
  'CATHARSIS',
  'ТРАЛИ-ВАЛИ',
  'GOOD TIMES',
  'ПОРНОФИЛЬМЫ',
  'НЕРВЫ',
];

function loadExisting() {
  try {
    const parsed = JSON.parse(readFileSync(sourcesPath, 'utf8'));
    return parsed.artists ?? {};
  } catch {
    return {};
  }
}

function runFetch(artist) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [join(root, 'scripts', 'fetch-artist-images-web.mjs'), `--artist=${artist}`],
      { cwd: root, stdio: 'inherit' },
    );
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`fetch failed for ${artist} (exit ${code})`));
    });
  });
}

async function main() {
  const existing = loadExisting();
  const missing = artists.filter((artist) => !existing[artist]);
  console.log(`Fetching ${missing.length}/${artists.length} missing 2018 artist images…`);

  for (const artist of missing) {
    await runFetch(artist);
  }

  console.log('Done.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
