import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from './config';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function saveUploadedImage(
  file: File,
  subdir = 'images',
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

  const ext = path.extname(file.name).replace('.', '').toLowerCase() || 'jpg';
  const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const targetPath = path.join(targetDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(targetPath, buffer);

  return `${config.uploadUrl}/${safeSubdir}/${filename}`;
}
