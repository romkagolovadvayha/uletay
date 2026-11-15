const fs = require('node:fs');
const path = require('node:path');
const { buildSync } = require('esbuild');
const { revision } = require('../src/components/map/maplibre-assets.json');

// Keep the ESM worker and its shared module together. Application bundlers
// must not rewrite their import.meta.url references (Metro or Next webpack).
function prepareMapLibreWeb(projectRoot = path.resolve(__dirname, '..')) {
  const packagePath = require.resolve('maplibre-gl/package.json', { paths: [projectRoot] });
  const { version } = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const source = path.join(path.dirname(packagePath), 'dist');
  const destination = path.join(projectRoot, 'public', 'vendor', 'maplibre', version);
  fs.mkdirSync(destination, { recursive: true });
  const license = fs.readFileSync(path.join(path.dirname(packagePath), 'LICENSE.txt'));
  const licenseTarget = path.join(destination, 'LICENSE.txt');
  if (!fs.existsSync(licenseTarget) || !fs.readFileSync(licenseTarget).equals(license)) fs.writeFileSync(licenseTarget, license);
  for (const file of ['maplibre-gl.mjs', 'maplibre-gl-shared.mjs', 'maplibre-gl-worker.mjs', 'maplibre-gl.css']) {
    const contents = fs.readFileSync(path.join(source, file));
    const target = path.join(destination, file);
    if (!fs.existsSync(target) || !fs.readFileSync(target).equals(contents)) fs.writeFileSync(target, contents);
  }
  const entry = `import * as api from './maplibre-gl.mjs';\napi.setWorkerUrl(new URL('./maplibre-gl-worker.mjs', import.meta.url).href);\nwindow.__uletayMapLibre = api;\n`;
  const entryPath = path.join(destination, 'entry.mjs');
  if (!fs.existsSync(entryPath) || fs.readFileSync(entryPath, 'utf8') !== entry) fs.writeFileSync(entryPath, entry);

  // Match taxi's classic window/worker bundles for older Safari and WebViews.
  // Keep the ESM entry above for the separately deployed CMS map editor.
  const compatible = path.join(destination, revision);
  fs.mkdirSync(compatible, { recursive: true });
  const write = (file, contents) => {
    const target = path.join(compatible, file), bytes = Buffer.from(contents);
    if (!fs.existsSync(target) || !fs.readFileSync(target).equals(bytes)) fs.writeFileSync(target, bytes);
  };
  write('LICENSE.txt', license);
  write('maplibre-gl.css', fs.readFileSync(path.join(source, 'maplibre-gl.css')));
  const options = {
    bundle: true, format: 'iife', platform: 'browser', target: ['chrome79', 'safari15'],
    minify: true, write: false, legalComments: 'inline',
    banner: { js: fs.readFileSync(path.join(__dirname, 'maplibre-compat.js'), 'utf8') },
    define: { 'import.meta.url': '""' },
  };
  write('maplibre-gl-worker.cjs', buildSync({ ...options,
    entryPoints: [path.join(source, 'maplibre-gl-worker.mjs')],
  }).outputFiles[0].contents);
  const workerUrl = `/vendor/maplibre/${version}/${revision}/maplibre-gl-worker.cjs`;
  write('entry.js', buildSync({ ...options,
    stdin: { contents: `import * as api from './maplibre-gl.mjs';\napi.setWorkerUrl(${JSON.stringify(workerUrl)});\nwindow.__uletayMapLibre = api;`,
      resolveDir: source, sourcefile: 'uletay-maplibre-entry.js' },
  }).outputFiles[0].contents);
}

module.exports = { prepareMapLibreWeb };
if (require.main === module) prepareMapLibreWeb(process.argv.includes('--cms') ? path.resolve(__dirname, '..', 'cms') : undefined);
