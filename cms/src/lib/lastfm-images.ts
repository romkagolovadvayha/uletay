import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type { HeadlinerLastFmImage, HeadlinerLastFmProfile } from '@/lastfm-types';
import { resolveArtistImageFallbackUrl } from './artist-image-fallback';
import { config } from './config';
import { lastFmFetch } from './lastfm-fetch';
import { IMAGE_PRESETS } from './image-presets';
import { writeListVariant } from './upload';

const IMAGE_SIZE_ORDER = ['mega', 'extralarge', 'large', 'medium', 'small'] as const;
const LASTFM_PLACEHOLDER_PREFIX = '2a96cbd8b46e442fc41c2b86b';
const LASTFM_PLACEHOLDER_FRAGMENTS = [
  `${LASTFM_PLACEHOLDER_PREFIX}821562f`,
  `${LASTFM_PLACEHOLDER_PREFIX}2415f0`,
];

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

  if (LASTFM_PLACEHOLDER_FRAGMENTS.some((fragment) => trimmed.includes(fragment))) {
    return false;
  }

  if (trimmed.includes(LASTFM_PLACEHOLDER_PREFIX)) {
    return false;
  }

  return true;
}

export function headlinerImageFilename(headlinerId: string): string {
  const slug = headlinerId.replace(/^hl-/, '') || 'artist';
  return `${slug}.webp`;
}

export function buildRandomHeadlinerImageFilename(headlinerId: string): string {
  const slug = headlinerId.replace(/^hl-/, '') || 'artist';
  const token = randomBytes(6).toString('hex');
  return `${slug}-${token}.webp`;
}

function imageUrlToLocalPath(imageUrl?: string | null): string | null {
  const trimmed = imageUrl?.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/\/images\/([^/?#]+)$/);
  if (!match?.[1]) {
    return null;
  }

  return path.join(config.uploadDir, 'images', match[1]);
}

export async function deleteStoredHeadlinerImages(
  headlinerId: string,
  imageUrl?: string | null,
): Promise<void> {
  const candidates = new Set<string>();

  const fromUrl = imageUrlToLocalPath(imageUrl);
  if (fromUrl) {
    candidates.add(fromUrl);
  }

  candidates.add(path.join(config.uploadDir, 'images', headlinerImageFilename(headlinerId)));

  for (const filePath of candidates) {
    if (!existsSync(filePath)) {
      continue;
    }
    await unlink(filePath).catch(() => undefined);
  }
}

async function downloadImageBuffer(imageUrl: string): Promise<Buffer> {
  const useLastFmFetch = /lastfm|audioscrobbler|fastly\.net\/i\/u\//i.test(imageUrl);
  const response = useLastFmFetch
    ? await lastFmFetch(imageUrl)
    : await fetch(imageUrl, {
        headers: {
          'User-Agent': 'UletayFestApp/1.0 (+https://uletay.ru)',
        },
        redirect: 'follow',
      });

  if (!response.ok) {
    throw new Error(`Image download HTTP ${response.status}`);
  }

  const input = Buffer.from(await response.arrayBuffer());
  if (input.length < 1500) {
    throw new Error('Image too small');
  }

  return input;
}

export async function downloadAndOptimizeArtistImage(
  imageUrl: string,
  headlinerId: string,
  options?: { filename?: string; flattenBackground?: string },
): Promise<string> {
  const input = await downloadImageBuffer(imageUrl);
  const { width, height } = IMAGE_PRESETS.artist;
  let pipeline = sharp(input, { animated: false }).rotate();
  if (options?.flattenBackground) {
    pipeline = pipeline.flatten({ background: options.flattenBackground });
  }
  const output = await pipeline
    .resize(width, height, { fit: 'cover', position: 'centre' })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  const targetDir = path.join(config.uploadDir, 'images');
  await mkdir(targetDir, { recursive: true });
  const filename = options?.filename ?? headlinerImageFilename(headlinerId);
  await writeFile(path.join(targetDir, filename), output);
  await writeListVariant(input, targetDir, filename);

  return `${config.uploadUrl}/images/${filename}`;
}

/** @deprecated Use downloadAndOptimizeArtistImage */
export const downloadAndOptimizeLastFmImage = downloadAndOptimizeArtistImage;

export type HeadlinerImageSyncSource = 'lastfm' | 'musicbrainz';

export async function syncHeadlinerImage(
  headlinerId: string,
  headlinerName: string,
  profile?: HeadlinerLastFmProfile,
): Promise<{ imageUrl: string; source: HeadlinerImageSyncSource } | null> {
  const lastFmUrl = profile ? pickLastFmImageUrl(profile.images) : null;
  if (lastFmUrl) {
    return {
      imageUrl: await downloadAndOptimizeArtistImage(lastFmUrl, headlinerId),
      source: 'lastfm',
    };
  }

  const fallbackUrl = await resolveArtistImageFallbackUrl(headlinerName, profile?.mbid);
  if (!fallbackUrl) {
    return null;
  }

  return {
    imageUrl: await downloadAndOptimizeArtistImage(fallbackUrl, headlinerId),
    source: 'musicbrainz',
  };
}

/** @deprecated Use syncHeadlinerImage */
export async function syncHeadlinerImageFromLastFm(
  headlinerId: string,
  profile: HeadlinerLastFmProfile,
): Promise<string | null> {
  const result = await syncHeadlinerImage(headlinerId, profile.name, profile);
  return result?.imageUrl ?? null;
}
