import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

process.env.EXPO_UNSTABLE_TREE_SHAKING = '1';
process.env.EXPO_UNSTABLE_METRO_OPTIMIZE_GRAPH = '1';

const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(root, '..');
const isWin = process.platform === 'win32';

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: process.env,
    cwd: projectRoot,
    // Only use shell for npx on Windows; never for node.exe (breaks on "Program Files").
    shell: isWin && command !== process.execPath,
  });
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

run('npx', exportArgs);
run(process.execPath, [path.join(root, 'copy-public-static.mjs')]);
run(process.execPath, [path.join(root, 'prune-dist-assets.mjs')]);
