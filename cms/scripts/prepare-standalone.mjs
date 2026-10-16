import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const standalone = path.join(root, '.next', 'standalone');
await mkdir(path.join(standalone, '.next'), { recursive: true });
for (const [from, to] of [['.next/static', '.next/static'], ['public', 'public'], ['data', 'data']]) {
  await cp(path.join(root, from), path.join(standalone, to), { recursive: true });
}
console.log('Standalone CMS: static files, map renderer and reference data copied.');
