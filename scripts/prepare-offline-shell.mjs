import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve('dist');
const extensions = /\.(?:js|mjs|cjs|css|ttf|woff2?|pbf|png|svg|webp|ico)$/i;
async function filesUnder(directory) {
  const entries = await readdir(path.join(dist, directory), { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const relative = path.posix.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(relative) : extensions.test(entry.name) ? [relative] : [];
  }))).flat();
}

// Include lazy screen chunks so a previously unopened section can open offline.
// Festival photos/videos are cached on use, not bulk-downloaded with the shell.
const assets = (await Promise.all(
  ['_expo', 'assets', 'vendor/maplibre', 'map-fonts'].map(filesUnder),
)).flat();
for (const entry of await readdir(dist, { withFileTypes: true })) {
  if (entry.isFile() && /\.(?:png|svg|webp|ico)$/.test(entry.name)) assets.push(entry.name);
}
assets.sort();
const hash = createHash('sha256');
hash.update(await readFile(path.join(dist, 'index.html')));
for (const asset of assets) hash.update(asset).update(await readFile(path.join(dist, asset)));
const workerPath = path.join(dist, 'sw.js');
const source = await readFile(workerPath, 'utf8');
hash.update(source);
const worker = source
  .replace("const CACHE_VERSION = 'v9';", `const CACHE_VERSION = 'v9-${hash.digest('hex').slice(0, 12)}';`)
  .replace('const PRECACHE_ASSETS = [];', `const PRECACHE_ASSETS = ${JSON.stringify(assets.map((asset) => '/' + asset))};`);
await writeFile(workerPath, worker);
console.log(`Offline shell: ${assets.length} scripts, fonts and UI assets prepared.`);
