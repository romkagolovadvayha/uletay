import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = join(root, 'assets');
const publicDir = join(root, 'public');

const NEW_SOURCE =
  'C:/Users/rom_i/.cursor/projects/c-xampp-htdocs-uletay/assets/c__Users_rom_i_AppData_Roaming_Cursor_User_workspaceStorage_4d0bb526b6df5749d7b407dd44b8dc56_images_yt_52-1d4c9cfe-021d-4e4d-9624-80d6a50dff70.png';

const SOURCE_FILE = join(assetsDir, 'icon-source.png');

const externalSource = process.argv[2];

function rel(path) {
  return path.replaceAll('\\', '/').replace(`${root.replaceAll('\\', '/')}/`, '');
}

function pngOptions(size) {
  if (size <= 64) {
    return { compressionLevel: 9, palette: true, quality: 90, effort: 10 };
  }
  return { compressionLevel: 9, effort: 7 };
}

async function writeIcon(input, output, size) {
  await sharp(input)
    .resize(size, size, { fit: 'cover', kernel: sharp.kernel.lanczos3 })
    .png(pngOptions(size))
    .toFile(output);
  console.log(`generated ${rel(output)} (${size}x${size})`);
}

async function writeMonochrome(input, output, size) {
  const { data, info } = await sharp(input)
    .resize(size, size, { fit: 'cover', kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (lum < 140) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
    } else {
      data[i + 3] = 0;
    }
  }

  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9, effort: 7 })
    .toFile(output);

  console.log(`generated ${rel(output)} (${size}x${size}, monochrome)`);
}

async function writeFaviconIco(input, output) {
  const sizes = [16, 32, 48];
  const tmpFiles = [];

  try {
    for (const size of sizes) {
      const tmp = join(assetsDir, `.favicon-${size}.png`);
      await sharp(input)
        .resize(size, size, { fit: 'cover', kernel: sharp.kernel.lanczos3 })
        .png(pngOptions(size))
        .toFile(tmp);
      tmpFiles.push(tmp);
    }

    execFileSync('magick', ['convert', ...tmpFiles, output], { stdio: 'pipe' });
    console.log(`generated ${rel(output)} (ico)`);
  } catch {
    console.log('skipped favicon.ico (ImageMagick unavailable)');
  } finally {
    for (const tmp of tmpFiles) {
      if (existsSync(tmp)) {
        unlinkSync(tmp);
      }
    }
  }
}

mkdirSync(publicDir, { recursive: true });

if (externalSource) {
  if (!existsSync(externalSource)) {
    throw new Error(`Source image not found: ${externalSource}`);
  }
  const sourceRaw = join(assetsDir, 'icon-source.raw.png');
  copyFileSync(externalSource, sourceRaw);
  await sharp(sourceRaw).png({ compressionLevel: 9, effort: 7 }).toFile(SOURCE_FILE);
  unlinkSync(sourceRaw);
  console.log(`saved ${rel(SOURCE_FILE)} (1024x1024 PNG)`);
} else if (!existsSync(SOURCE_FILE) && existsSync(NEW_SOURCE)) {
  const sourceRaw = join(assetsDir, 'icon-source.raw.png');
  copyFileSync(NEW_SOURCE, sourceRaw);
  await sharp(sourceRaw).png({ compressionLevel: 9, effort: 7 }).toFile(SOURCE_FILE);
  unlinkSync(sourceRaw);
  console.log(`saved ${rel(SOURCE_FILE)} (1024x1024 PNG)`);
} else if (!existsSync(SOURCE_FILE)) {
  throw new Error('icon-source.png not found — pass a source image path as the first argument');
} else {
  console.log(`using ${rel(SOURCE_FILE)}`);
}

const outputs = [
  [join(assetsDir, 'icon.png'), 1024],
  [join(assetsDir, 'splash-icon.png'), 512],
  [join(assetsDir, 'favicon.png'), 48],
  [join(assetsDir, 'android-icon-foreground.png'), 1024],
  [join(publicDir, 'favicon.png'), 48],
  [join(publicDir, 'favicon-32x32.png'), 32],
  [join(publicDir, 'favicon-16x16.png'), 16],
  [join(publicDir, 'apple-touch-icon.png'), 180],
  [join(publicDir, 'icon-192.png'), 192],
  [join(publicDir, 'icon-512.png'), 512],
  [join(publicDir, 'icon-16.png'), 16],
  [join(publicDir, 'icon-32.png'), 32],
  [join(publicDir, 'icon-48.png'), 48],
  [join(publicDir, 'icon-64.png'), 64],
  [join(publicDir, 'icon-180.png'), 180],
];

for (const [output, size] of outputs) {
  await writeIcon(SOURCE_FILE, output, size);
}

await writeMonochrome(SOURCE_FILE, join(assetsDir, 'android-icon-monochrome.png'), 1024);
await writeFaviconIco(SOURCE_FILE, join(publicDir, 'favicon.ico'));

for (const stale of [
  'icon-source-512.png',
  'icon-source-256.png',
  'icon-source-64.png',
  'android-icon-background.png',
]) {
  const path = join(assetsDir, stale);
  if (existsSync(path)) {
    unlinkSync(path);
    console.log(`removed stale ${stale}`);
  }
}

console.log('App icons generated and optimized');
