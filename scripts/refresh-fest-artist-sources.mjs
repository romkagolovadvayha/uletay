import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const result = spawnSync(process.execPath, [join(root, 'scripts', 'sync-fest-artist-images.mjs')], {
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
