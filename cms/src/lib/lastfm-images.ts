import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type { HeadlinerLastFmImage, HeadlinerLastFmProfile } from '@/lastfm-types';
import { config } from './config';
import { IMAGE_PRESETS } from './image-presets';

const IMAGE_SIZE_ORDER = ['mega', 'extralarge', 'large', 'medium', 'small'] as const;
const LASTFM_PLACEHOLDER_FRAGMENTS = ['2a96cbd8b46e442fc41c2b86b2415f0'];

export function pickLastFmImageUrl(images?: HeadlinerLastFmImage[]): string | null {
  if (!images?.length) {
    return null;
  }

  const bySize = new Map(images.map((image) => [image.size, image.url.trim()]));
  for (const size of IMAGE_SIZE_ORDER) {
    const url = bySize.get(size);
    if (url && isUsableLastFmImageUrl(url)) {
      return url;
    }
  }

  const fallback = images.find((image) => isUsableLastFmImageUrl(image.url));
  return fallback?.url ?? null;
}

export function isUsableLastFmImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed.startsWith('http')) {
    return false;
  }

  return !LASTFM_PLACEHOLDER_FRAGMENTS.some((fragment) => trimmed.includes(fragment));
}

export function headlinerImageFilename(headlinerId: string): string {
  const slug = headlinerId.replace(/^hl-/, '') || 'artist';
  return `${slug}.webp`;
}

export async function downloadAndOptimizeLastFmImage(
  imageUrl: string,
  headlinerId: string,
): Promise<string> {
  const response = await fetch(imageUrl, {
    headers: { 'User-Agent': 'UletayFest/1.0' },
    redirect: 'follow',
  });
  if (!response.ok) {
    throw new Error(`Image download HTTP ${response.status}`);
  }

  const input = Buffer.from(await response.arrayBuffer());
  if (input.length < 500) {
    throw new Error('Image too small');
  }

  const { width, height } = IMAGE_PRESETS.artist;
  const output = await sharp(input, { animated: false })
    .rotate()
    .resize(width, height, { fit: 'cover', position: 'centre' })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  const targetDir = path.join(config.uploadDir, 'images');
  await mkdir(targetDir, { recursive: true });
  const filename = headlinerImageFilename(headlinerId);
  await writeFile(path.join(targetDir, filename), output);

  return `${config.uploadUrl}/images/${filename}`;
}

export async function syncHeadlinerImageFromLastFm(
  headlinerId: string,
  profile: HeadlinerLastFmProfile,
): Promise<string | null> {
  const sourceUrl = pickLastFmImageUrl(profile.images);
  if (!sourceUrl) {
    return null;
  }

  return downloadAndOptimizeLastFmImage(sourceUrl, headlinerId);
}
