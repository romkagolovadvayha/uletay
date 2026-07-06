import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { foodcourtVendors } from './foodcourt-data.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = path.join(root, 'assets/images/foodcourt');
const dataPath = path.join(root, 'cms/scripts/foodcourt-data.mjs');

/** @type {Record<string, string>} */
const LOGO_SOURCES = {
  'fc-blinberi':
    'https://avatars.mds.yandex.net/get-altay/15683978/2a000001997e15ec3be7d68050384e1cf2d9/orig',
  'fc-molevich':
    'https://scontent-hel3-1.cdninstagram.com/v/t51.2885-19/65575563_2326157610800598_3168800220716728320_n.jpg?stp=dst-jpg_s320x320_tt6&_nc_cat=101&ccb=7-5&_nc_sid=bf7eb4&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy44MzQuQzMifQ%3D%3D&_nc_ohc=iykZ3rkaIO8Q7kNvwGTpWJW&_nc_oc=AdpD97Zz8gKAvu60hy6z5BfqxdfrGrsLFSTycIIlPIEIWX2LcxmvuVA2d5gEsGMK87I&_nc_zt=24&_nc_ht=scontent-hel3-1.cdninstagram.com&_nc_ss=7b20f&oh=00_AQCG3zEDoR4XpiDdFx7yoeAMfq3NelbCiZJH5bTnp60cKQ&oe=6A5143BE',
  'fc-raketa':
    'https://avatars.mds.yandex.net/get-altay/13072111/2a0000018ef513b45d53a66d51a256aee6fc/orig',
  'fc-shashlyk-mashina': 'https://shashle-machine.ru/favicon-96x96.png',
  'fc-panda-grill': 'https://pandagrill.ru/uploads/catalog/logo/logo_panda-gril_2025.svg',
  'fc-ronni':
    'https://www.welcome-group.ru/upload/iblock/8eb/1xmjnt648bj843sskxbpx9ru263t20gs/logo-roni-116p.svg',
  'fc-vashe-ogon': 'https://static.tildacdn.com/tild3866-6464-4034-b363-313566323139/_sf.png',
};

mkdirSync(outDir, { recursive: true });

async function saveLogo(filename, url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'uletay-cms/1.0' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const outPath = path.join(outDir, `${filename}.jpg`);
  await sharp(buf)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 20, g: 20, b: 20, alpha: 1 },
    })
    .jpeg({ quality: 85 })
    .toFile(outPath);
  return outPath;
}

const results = [];
for (const [id, url] of Object.entries(LOGO_SOURCES)) {
  const vendor = foodcourtVendors.find((v) => v.id === id);
  if (!vendor) {
    results.push({ id, status: 'skip', reason: 'vendor not found' });
    continue;
  }
  const filename = id.replace(/^fc-/, '');
  try {
    await saveLogo(filename, url);
    results.push({ id, status: 'ok', filename });
  } catch (error) {
    results.push({ id, status: 'fail', error: String(error) });
  }
}

let dataSource = readFileSync(dataPath, 'utf8');
let patched = 0;

for (const { id, status, filename } of results) {
  if (status !== 'ok') continue;
  const vendor = foodcourtVendors.find((v) => v.id === id);
  if (!vendor || vendor.imageUrl) continue;

  const needle = `id: '${id}',`;
  const idx = dataSource.indexOf(needle);
  if (idx === -1) continue;

  const blockEnd = dataSource.indexOf('\n  },', idx);
  const block = dataSource.slice(idx, blockEnd);
  if (block.includes('imageUrl:')) continue;

  const tintMatch = block.match(/imageTint: '[^']+',/);
  if (!tintMatch) continue;

  const insert = `${tintMatch[0]}\n    imageUrl: img('${filename}'),`;
  const newBlock = block.replace(tintMatch[0], insert);
  dataSource = dataSource.slice(0, idx) + newBlock + dataSource.slice(blockEnd);
  patched += 1;
}

if (patched > 0) {
  writeFileSync(dataPath, dataSource, 'utf8');
}

console.log(JSON.stringify({ results, patched }, null, 2));
