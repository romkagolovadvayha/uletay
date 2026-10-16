import { cp, lstat, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(root, 'tmp', 'handover');
const source = path.join(destination, 'source');
const entries = [
  'README.md',
  'LICENSE',
  '.editorconfig',
  '.gitattributes',
  '.nvmrc',
  '.gitignore',
  '.easignore',
  '.env.example',
  'package.json',
  'package-lock.json',
  'App.tsx',
  'index.ts',
  'index.html',
  'app.json',
  'app.config.js',
  'babel.config.js',
  'metro.config.js',
  'react-native.config.js',
  'eslint.config.js',
  'tsconfig.json',
  'eas.json',
  'src',
  'shared',
  'assets',
  'public',
  'scripts',
  'plugins',
  'patches',
  'tests',
  'docs',
  'deploy',
  '.github',
  'cms/package.json',
  'cms/package-lock.json',
  'cms/.env.example',
  'cms/tsconfig.json',
  'cms/next-env.d.ts',
  'cms/next.config.ts',
  'cms/src',
  'cms/scripts',
  'cms/seed',
  'cms/data',
  'cms/public',
];
const forbidden = new Set([
  'node_modules',
  '.git',
  '__pycache__',
  '.next',
  '.next-dev',
  '.fest-cache',
  'vendor',
]);
function allowed(filename) {
  const name = path.basename(filename);
  return (
    !forbidden.has(name) &&
    (!name.startsWith('.env') || name === '.env.example') &&
    !/\.(?:pem|key|p8|p12|jks|keystore|pyc|tsbuildinfo|log)$/i.test(name) &&
    !/service.account|credentials\.json|google-services\.json/i.test(name)
  );
}
await mkdir(destination, { recursive: true });
// This is the dedicated generated output, never the working copy.
if (path.dirname(source) !== destination || !destination.startsWith(root + path.sep))
  throw new Error('Invalid output directory');
await rm(source, { recursive: true, force: true });
await mkdir(source);
for (const entry of entries) {
  const from = path.join(root, entry);
  await cp(from, path.join(source, entry), { recursive: true, filter: allowed });
}
let files = 0;
async function inspect(directory) {
  for (const name of await readdir(directory)) {
    const file = path.join(directory, name);
    const stat = await lstat(file);
    if (stat.isSymbolicLink())
      throw new Error(`Symlink is not permitted in the handover: ${path.relative(source, file)}`);
    if (stat.isDirectory()) {
      await inspect(file);
      continue;
    }
    files++;
    if (/\.(?:[cm]?js|tsx?|json|md|ya?ml|sh|toml|txt)$/i.test(name)) {
      const text = await readFile(file, 'utf8');
      if (
        /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|vk1\.[A-Za-z0-9_-]{40,}|gh[pousr]_[A-Za-z0-9]{30,}/.test(
          text,
        )
      ) {
        throw new Error(
          `Possible credential in ${path.relative(source, file)}; archive was not created`,
        );
      }
    }
  }
}
await inspect(source);
const archive = path.join(destination, 'uletay-source.tar.gz');
const result = spawnSync('tar', ['-czf', archive, '-C', source, '.'], {
  stdio: 'inherit',
  shell: false,
});
if (result.error) throw result.error;
if (result.status !== 0) throw new Error('Unable to create source archive');
await writeFile(
  path.join(destination, 'manifest.json'),
  JSON.stringify(
    {
      createdAt: new Date().toISOString(),
      files,
      archive: path.basename(archive),
      included: entries,
    },
    null,
    2,
  ) + '\n',
);
console.log(`Handover: ${files} files; ${path.relative(root, archive)}`);
