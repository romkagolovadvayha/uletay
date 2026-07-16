/**
 * Generate display siblings for existing CMS uploads (never overwrites originals):
 * - `name-list.webp` — 160×160 cover (artist/thumb lists)
 * - `name-sm.webp` — 540×216 contain when source aspect ≥ 1.5 (logos / wide art)
 *
 * Usage (on the server, from cms/):
 *   npm run images:generate-list:dry
 *   npm run images:generate-list
 *
 * Optional: UPLOAD_DIR=/path/to/uploads npm run images:generate-list
 */
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dryRun = process.argv.includes('--dry');

const LIST_SIZE = 160;
const LIST_QUALITY = 80;
const LOGO_SM_WIDTH = 540;
const LOGO_SM_HEIGHT = 216;
const LOGO_SM_QUALITY = 78;
/** Logos / banners (e.g. 900×360 ≈ 2.5, 720×288 = 2.5). */
const WIDE_ASPECT = 1.2;

function resolveUploadImagesDir() {
  const fromEnv = process.env.UPLOAD_DIR;
  if (fromEnv) {
    const base = path.isAbsolute(fromEnv) ? fromEnv : path.resolve(process.cwd(), fromEnv);
    return path.join(base, 'images');
  }
  return path.resolve(__dirname, '../../uploads/images');
}

function isOriginalWebp(name) {
  const lower = name.toLowerCase();
  return (
    lower.endsWith('.webp') &&
    !lower.endsWith('-list.webp') &&
    !lower.endsWith('-sm.webp')
  );
}

function listNameFor(filename) {
  return filename.replace(/(\.webp)$/i, '-list$1');
}

function smNameFor(filename) {
  return filename.replace(/(\.webp)$/i, '-sm$1');
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const imagesDir = resolveUploadImagesDir();
  let entries;
  try {
    entries = await readdir(imagesDir);
  } catch (error) {
    console.error(`Cannot read ${imagesDir}:`, error.message);
    process.exit(1);
  }

  const sources = entries.filter(isOriginalWebp);

  console.log(
    `Dir: ${imagesDir}\nSources: ${sources.length} originals (will not be modified)\nMode: ${dryRun ? 'dry-run' : 'write siblings only'}`,
  );

  let listWritten = 0;
  let listSkipped = 0;
  let smWritten = 0;
  let smSkipped = 0;

  for (const name of sources) {
    const fullPath = path.join(imagesDir, name);
    const listName = listNameFor(name);
    const listPath = path.join(imagesDir, listName);
    const smName = smNameFor(name);
    const smPath = path.join(imagesDir, smName);

    let input;
    let meta;

    const needList = !(await exists(listPath));
    let needSm = !(await exists(smPath));

    if (!needList && !needSm) {
      listSkipped += 1;
      smSkipped += 1;
      continue;
    }

    try {
      input = await readFile(fullPath);
      meta = await sharp(input, { animated: false }).metadata();
    } catch (error) {
      console.warn(`skip ${name}: ${error.message}`);
      continue;
    }

    const width = meta.width ?? 0;
    const height = meta.height ?? 1;
    const isWide = width / height >= WIDE_ASPECT;
    if (!isWide) {
      needSm = false;
      if (await exists(smPath)) {
        smSkipped += 1;
      }
    }

    if (needList) {
      if (dryRun) {
        console.log(`[dry] would write ${listName}`);
        listWritten += 1;
      } else {
        try {
          const output = await sharp(input, { animated: false })
            .rotate()
            .resize(LIST_SIZE, LIST_SIZE, { fit: 'cover', position: 'centre' })
            .webp({ quality: LIST_QUALITY, effort: 4 })
            .toBuffer();
          await writeFile(listPath, output);
          console.log(`wrote ${listName} (${output.length} bytes)`);
          listWritten += 1;
        } catch (error) {
          console.warn(`skip list ${name}: ${error.message}`);
        }
      }
    } else {
      listSkipped += 1;
    }

    if (needSm && isWide) {
      if (dryRun) {
        console.log(`[dry] would write ${smName}`);
        smWritten += 1;
      } else {
        try {
          const output = await sharp(input, { animated: false })
            .rotate()
            .resize(LOGO_SM_WIDTH, LOGO_SM_HEIGHT, {
              fit: 'contain',
              background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
            .webp({ quality: LOGO_SM_QUALITY, effort: 4 })
            .toBuffer();
          await writeFile(smPath, output);
          console.log(`wrote ${smName} (${output.length} bytes)`);
          smWritten += 1;
        } catch (error) {
          console.warn(`skip sm ${name}: ${error.message}`);
        }
      }
    } else if (isWide) {
      smSkipped += 1;
    }
  }

  console.log(
    `${dryRun ? 'Dry run: ' : ''}list: ${listWritten} ${dryRun ? 'planned' : 'written'} / ${listSkipped} present; sm (wide): ${smWritten} ${dryRun ? 'planned' : 'written'} / ${smSkipped} present`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
