/**
 * Generate `*-list.webp` (160×160) siblings for existing CMS uploads.
 *
 * Safety: never overwrites or rewrites originals — only creates new
 * `name-list.webp` next to `name.webp`. Existing `-list.webp` are skipped.
 *
 * Usage (on the server, from cms/):
 *   npm run images:generate-list:dry   # preview
 *   npm run images:generate-list       # write siblings
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

function resolveUploadImagesDir() {
  const fromEnv = process.env.UPLOAD_DIR;
  if (fromEnv) {
    const base = path.isAbsolute(fromEnv) ? fromEnv : path.resolve(process.cwd(), fromEnv);
    return path.join(base, 'images');
  }
  return path.resolve(__dirname, '../../uploads/images');
}

function listNameFor(filename) {
  return filename.replace(/(\.webp)$/i, '-list$1');
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

  const sources = entries.filter(
    (name) =>
      name.toLowerCase().endsWith('.webp') &&
      !name.toLowerCase().endsWith('-list.webp'),
  );

  console.log(
    `Dir: ${imagesDir}\nSources: ${sources.length} originals (will not be modified)\nMode: ${dryRun ? 'dry-run' : 'write siblings only'}`,
  );

  let written = 0;
  let skipped = 0;

  for (const name of sources) {
    const listName = listNameFor(name);
    const listPath = path.join(imagesDir, listName);
    try {
      await stat(listPath);
      skipped += 1;
      continue;
    } catch {
      // missing — generate
    }

    const fullPath = path.join(imagesDir, name);
    if (dryRun) {
      console.log(`[dry] would write ${listName}`);
      written += 1;
      continue;
    }

    try {
      const input = await readFile(fullPath);
      const output = await sharp(input, { animated: false })
        .rotate()
        .resize(LIST_SIZE, LIST_SIZE, { fit: 'cover', position: 'centre' })
        .webp({ quality: LIST_QUALITY, effort: 4 })
        .toBuffer();
      await writeFile(listPath, output);
      console.log(`wrote ${listName} (${output.length} bytes)`);
      written += 1;
    } catch (error) {
      console.warn(`skip ${name}: ${error.message}`);
    }
  }

  console.log(
    `${dryRun ? 'Dry run: ' : ''}list variants: ${written} ${dryRun ? 'planned' : 'written'}, ${skipped} already present (${sources.length} sources in ${imagesDir})`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
