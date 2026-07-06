import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = join(root, 'assets');

const BRAND_YELLOW = '#FFC107';
const BRAND_BLACK = '#000000';

function iconSvg(size) {
  const fontSize = Math.round(size * 0.52);
  const y = Math.round(size * 0.62);

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="${BRAND_BLACK}" />
  <text x="50%" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" fill="${BRAND_YELLOW}" text-anchor="middle">У</text>
</svg>`);
}

async function writePng(name, size) {
  const output = join(assetsDir, name);
  await sharp(iconSvg(size)).png().toFile(output);
  console.log(`generated ${name} (${size}x${size})`);
}

async function writeForeground(name, size) {
  const output = join(assetsDir, name);
  const fontSize = Math.round(size * 0.52);
  const y = Math.round(size * 0.62);
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <text x="50%" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" fill="${BRAND_YELLOW}" text-anchor="middle">У</text>
</svg>`);
  await sharp(svg).png().toFile(output);
  console.log(`generated ${name} (${size}x${size})`);
}

async function writeSolid(name, size, color) {
  const output = join(assetsDir, name);
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: color,
    },
  })
    .png()
    .toFile(output);
  console.log(`generated ${name} (${size}x${size})`);
}

await writePng('icon.png', 1024);
await writePng('favicon.png', 48);
await writePng('splash-icon.png', 512);
await writeSolid('android-icon-background.png', 1024, BRAND_BLACK);
await writeForeground('android-icon-foreground.png', 1024);
await writeForeground('android-icon-monochrome.png', 1024);

writeFileSync(
  join(assetsDir, 'icon-source.svg'),
  iconSvg(1024).toString('utf8'),
  'utf8',
);

console.log('App icons generated');
