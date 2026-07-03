// Обновляет scripts/fest-artist-sources.json с uletayfest.ru
// Запуск: node scripts/refresh-fest-artist-sources.mjs

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const result = spawnSync(process.execPath, [join(root, 'scripts', 'build-fest-artist-sources.mjs')], {
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
