import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

process.env.EXPO_UNSTABLE_TREE_SHAKING = '1';
process.env.EXPO_UNSTABLE_METRO_OPTIMIZE_GRAPH = '1';

const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(root, '..');
const require = createRequire(import.meta.url);
const expoCli = require.resolve('expo/bin/cli');
const tsxCli = require.resolve('tsx/cli');

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: process.env,
    cwd: projectRoot,
    shell: false,
  });
  if (result.error) {
    console.error(result.error);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const exportAll = process.argv.includes('--all');
const withSourceMaps =
  process.argv.includes('--source-maps') || process.env.EXPO_SOURCE_MAPS === '1';

const exportArgs = exportAll
  ? ['expo', 'export']
  : ['expo', 'export', '--platform', 'web'];
if (withSourceMaps) {
  exportArgs.push('--source-maps');
}

run(process.execPath, [expoCli, ...exportArgs.slice(1)]);
run(process.execPath, [path.join(root, 'copy-public-static.mjs')]);
run(process.execPath, [path.join(root, 'flatten-web-font-assets.mjs')]);
run(process.execPath, [tsxCli, path.join(root, 'generate-web-seo.ts')]);
run(process.execPath, [path.join(root, 'check-web-seo.mjs')]);
run(process.execPath, [path.join(root, 'prune-dist-assets.mjs')]);
