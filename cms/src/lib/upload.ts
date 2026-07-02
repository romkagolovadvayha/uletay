import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { config } from './config';
import { IMAGE_PRESETS, type ImagePreset } from './image-presets';

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

  const { width, height } = IMAGE_PRESETS[resolvePreset(preset)];
  const input = Buffer.from(await file.arrayBuffer());

  let output: Buffer;
  try {
    output = await sharp(input, { animated: false })
      .rotate()
      .resize(width, height, { fit: 'cover', position: 'centre' })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();
  } catch {
    throw new ImageUploadError('Не удалось обработать изображение');
  }

  const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2)}.webp`;
  const targetPath = path.join(targetDir, filename);

  try {
    await writeFile(targetPath, output);
  } catch {
    throw new ImageUploadError('Нет прав на запись в папку uploads');
  }

  return `${config.uploadUrl}/${safeSubdir}/${filename}`;
}
