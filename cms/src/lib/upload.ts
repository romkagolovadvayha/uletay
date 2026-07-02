import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { config } from './config';
import { IMAGE_PRESETS, type ImagePreset } from './image-presets';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function resolvePreset(preset: string): ImagePreset {
  if (preset in IMAGE_PRESETS) {
    return preset as ImagePreset;
  }
  return 'artist';
}

export async function saveUploadedImage(
  file: File,
  subdir = 'images',
  preset: ImagePreset | string = 'artist',
): Promise<string | null> {
  if (!file || file.size === 0) {
    return null;
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return null;
  }

  const safeSubdir = subdir.replace(/[^a-zA-Z0-9_-]/g, '') || 'images';
  const targetDir = path.join(config.uploadDir, safeSubdir);
  await mkdir(targetDir, { recursive: true });

  const { width, height } = IMAGE_PRESETS[resolvePreset(preset)];
  const input = Buffer.from(await file.arrayBuffer());
  const output = await sharp(input, { animated: false })
    .rotate()
    .resize(width, height, { fit: 'cover', position: 'centre' })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2)}.webp`;
  const targetPath = path.join(targetDir, filename);
  await writeFile(targetPath, output);

  return `${config.uploadUrl}/${safeSubdir}/${filename}`;
}
