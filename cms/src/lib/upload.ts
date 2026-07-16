import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { config } from './config';
import {
  IMAGE_PRESETS,
  PRESETS_WITH_LIST_VARIANT,
  listFilenameFromFull,
  type ImagePreset,
} from './image-presets';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const EXT_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export class ImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageUploadError';
  }
}

function resolvePreset(preset: string): ImagePreset {
  if (preset in IMAGE_PRESETS) {
    return preset as ImagePreset;
  }
  return 'artist';
}

function resolveMime(file: File): string | null {
  if (file.type && ALLOWED_MIME.has(file.type)) {
    return file.type;
  }

  const ext = path.extname(file.name).toLowerCase();
  const fromExt = EXT_TO_MIME[ext];
  return fromExt && ALLOWED_MIME.has(fromExt) ? fromExt : null;
}

async function resizeToWebp(
  input: Buffer,
  presetKey: ImagePreset,
  quality = 82,
): Promise<Buffer> {
  const { width, height } = IMAGE_PRESETS[presetKey];
  let pipeline = sharp(input, { animated: false }).rotate();
  pipeline =
    presetKey === 'logo'
      ? pipeline.resize(width, height, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
      : pipeline.resize(width, height, { fit: 'cover', position: 'centre' });
  return pipeline.webp({ quality, effort: 4 }).toBuffer();
}

/** Write a 160×160 sibling `*-list.webp` next to an artist/thumb upload. */
export async function writeListVariant(
  input: Buffer,
  targetDir: string,
  fullFilename: string,
): Promise<void> {
  const listName = listFilenameFromFull(fullFilename);
  const output = await resizeToWebp(input, 'list', 80);
  await writeFile(path.join(targetDir, listName), output);
}

export async function saveUploadedImage(
  file: File,
  subdir = 'images',
  preset: ImagePreset | string = 'artist',
): Promise<string> {
  if (!file || file.size === 0) {
    throw new ImageUploadError('Файл пустой');
  }

  if (!resolveMime(file)) {
    throw new ImageUploadError('Поддерживаются JPG, PNG, WebP и GIF');
  }

  const safeSubdir = subdir.replace(/[^a-zA-Z0-9_-]/g, '') || 'images';
  const targetDir = path.join(config.uploadDir, safeSubdir);

  try {
    await mkdir(targetDir, { recursive: true });
  } catch {
    throw new ImageUploadError('Не удалось создать папку для загрузок на сервере');
  }

  const presetKey = resolvePreset(preset);
  const input = Buffer.from(await file.arrayBuffer());

  let output: Buffer;
  try {
    output = await resizeToWebp(input, presetKey);
  } catch {
    throw new ImageUploadError('Не удалось обработать изображение');
  }

  const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2)}.webp`;
  const targetPath = path.join(targetDir, filename);

  try {
    await writeFile(targetPath, output);
    if (PRESETS_WITH_LIST_VARIANT.has(presetKey)) {
      await writeListVariant(input, targetDir, filename);
    }
  } catch (error) {
    if (error instanceof ImageUploadError) {
      throw error;
    }
    throw new ImageUploadError('Нет прав на запись в папку uploads');
  }

  return `${config.uploadUrl}/${safeSubdir}/${filename}`;
}

/** PNG/JPEG схемы карты — без WebP, сохраняем прозрачность. */
export async function saveUploadedMapScheme(
  file: File,
): Promise<{ url: string; width: number; height: number }> {
  if (!file || file.size === 0) {
    throw new ImageUploadError('Файл пустой');
  }

  const mime = resolveMime(file);
  if (!mime) {
    throw new ImageUploadError('Поддерживаются JPG, PNG, WebP и GIF');
  }

  const targetDir = path.join(config.uploadDir, 'maps');
  await mkdir(targetDir, { recursive: true });

  const input = Buffer.from(await file.arrayBuffer());
  let pipeline = sharp(input, { animated: false }).rotate();
  const meta = await pipeline.metadata();
  const width = meta.width ?? 1;
  const height = meta.height ?? 1;
  const maxSide = Math.max(width, height);

  if (maxSide > 4096) {
    pipeline = pipeline.resize(4096, 4096, { fit: 'inside', withoutEnlargement: true });
  }

  const ext = mime === 'image/jpeg' ? '.jpg' : mime === 'image/png' ? '.png' : '.webp';
  let output: Buffer;
  if (ext === '.png') {
    output = await pipeline.png().toBuffer();
  } else if (ext === '.jpg') {
    output = await pipeline.jpeg({ quality: 90 }).toBuffer();
  } else {
    output = await pipeline.webp({ quality: 90 }).toBuffer();
  }

  const filename = `map_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
  await writeFile(path.join(targetDir, filename), output);

  const finalMeta = await sharp(output).metadata();
  return {
    url: `${config.uploadUrl}/maps/${filename}`,
    width: finalMeta.width ?? width,
    height: finalMeta.height ?? height,
  };
}
