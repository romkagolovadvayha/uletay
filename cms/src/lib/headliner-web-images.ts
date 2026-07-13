import { copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Headliner } from '@/types';
import { config } from './config';
import { resolveMusicCoverImageUrl } from './duckduckgo-images';
import { lookupFestArtistUploadUrl } from './fest-artist-sources';
import { collectGroupIdentityNames, getHeadlinerGroup } from './headliner-groups';
import {
  buildRandomHeadlinerImageFilename,
  deleteStoredHeadlinerImages,
  downloadAndOptimizeArtistImage,
  headlinerImageFilename,
  pickLastFmImageUrl,
  syncHeadlinerImage,
} from './lastfm-images';

export type HeadlinerImageFetchSource = 'group' | 'fest-artist' | 'lastfm' | 'musicbrainz' | 'web';

export type HeadlinerImageFetchResult = {
  imageUrl: string;
  source: HeadlinerImageFetchSource;
  query?: string;
  title?: string;
  localFilename?: string;
};

export type HeadlinerImageSyncOptions = {
  force?: boolean;
};

function groupKey(group: Headliner[]): string {
  return group
    .map((item) => item.id)
    .sort()
    .join('|');
}

function localImagePath(filename: string): string {
  return path.join(config.uploadDir, 'images', filename);
}

function publicImageUrl(filename: string): string {
  return `${config.uploadUrl}/images/${filename}`;
}

function imageUrlToFilename(imageUrl: string): string | null {
  const match = imageUrl.trim().match(/\/images\/([^/?#]+)$/);
  return match?.[1] ?? null;
}

async function deleteGroupStoredImages(group: Headliner[]): Promise<void> {
  for (const member of group) {
    await deleteStoredHeadlinerImages(member.id, member.imageUrl);
  }
}

async function copyLocalImageFile(
  fromFilename: string,
  toHeadlinerId: string,
  bustCache: boolean,
): Promise<string> {
  const toFilename = bustCache
    ? buildRandomHeadlinerImageFilename(toHeadlinerId)
    : headlinerImageFilename(toHeadlinerId);
  await copyFile(localImagePath(fromFilename), localImagePath(toFilename));
  return publicImageUrl(toFilename);
}

export async function propagateHeadlinerImageToGroup(
  sourceHeadlinerId: string,
  sourceImageUrl: string,
  group: Headliner[],
  options?: HeadlinerImageSyncOptions,
): Promise<Record<string, string>> {
  const bustCache = Boolean(options?.force);
  const sourceFilename = imageUrlToFilename(sourceImageUrl);
  if (!sourceFilename) {
    throw new Error(`Invalid source image URL: ${sourceImageUrl}`);
  }

  const updates: Record<string, string> = {};

  for (const member of group) {
    if (bustCache) {
      await deleteStoredHeadlinerImages(member.id, member.imageUrl);
    }

    if (member.id === sourceHeadlinerId) {
      updates[member.id] = sourceImageUrl;
      continue;
    }

    updates[member.id] = await copyLocalImageFile(sourceFilename, member.id, bustCache);
  }

  return updates;
}

async function tryFestArtistImage(
  names: string[],
  headlinerId: string,
  bustCache: boolean,
): Promise<HeadlinerImageFetchResult | null> {
  for (const name of names) {
    const sourceUrl = lookupFestArtistUploadUrl(name);
    if (!sourceUrl) {
      continue;
    }

    const uploadMatch = sourceUrl.match(/\/api\/uploads\/images\/(.+)$/);
    if (uploadMatch?.[1]) {
      const localSource = localImagePath(uploadMatch[1]);
      if (existsSync(localSource)) {
        const targetFilename = bustCache
          ? buildRandomHeadlinerImageFilename(headlinerId)
          : headlinerImageFilename(headlinerId);
        await copyFile(localSource, localImagePath(targetFilename));
        return {
          imageUrl: publicImageUrl(targetFilename),
          source: 'fest-artist',
          localFilename: targetFilename,
        };
      }
    }

    if (sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://')) {
      const targetFilename = bustCache
        ? buildRandomHeadlinerImageFilename(headlinerId)
        : undefined;
      return {
        imageUrl: await downloadAndOptimizeArtistImage(sourceUrl, headlinerId, {
          filename: targetFilename,
        }),
        source: 'fest-artist',
        localFilename: targetFilename ?? headlinerImageFilename(headlinerId),
      };
    }
  }

  return null;
}

async function tryCachedProfileImage(
  headliner: Headliner,
  bustCache: boolean,
): Promise<HeadlinerImageFetchResult | null> {
  const targetFilename = bustCache ? buildRandomHeadlinerImageFilename(headliner.id) : undefined;
  const lastFmUrl = pickLastFmImageUrl(headliner.lastfm?.images);
  if (lastFmUrl) {
    return {
      imageUrl: await downloadAndOptimizeArtistImage(lastFmUrl, headliner.id, {
        filename: targetFilename,
      }),
      source: 'lastfm',
      localFilename: targetFilename ?? headlinerImageFilename(headliner.id),
    };
  }

  const synced = await syncHeadlinerImage(headliner.id, headliner.name, headliner.lastfm);
  if (!synced) {
    return null;
  }

  if (bustCache && targetFilename) {
    const currentFilename = imageUrlToFilename(synced.imageUrl);
    if (currentFilename && currentFilename !== targetFilename) {
      await copyFile(localImagePath(currentFilename), localImagePath(targetFilename));
      await deleteStoredHeadlinerImages(headliner.id, synced.imageUrl);
      return {
        imageUrl: publicImageUrl(targetFilename),
        source: synced.source,
        localFilename: targetFilename,
      };
    }
  }

  return {
    imageUrl: synced.imageUrl,
    source: synced.source,
    localFilename: imageUrlToFilename(synced.imageUrl) ?? headlinerImageFilename(headliner.id),
  };
}

async function tryWebCoverImage(
  names: string[],
  headlinerId: string,
  bustCache: boolean,
): Promise<HeadlinerImageFetchResult | null> {
  const resolved = await resolveMusicCoverImageUrl(names);
  if (!resolved) {
    return null;
  }

  const targetFilename = bustCache
    ? buildRandomHeadlinerImageFilename(headlinerId)
    : headlinerImageFilename(headlinerId);

  return {
    imageUrl: await downloadAndOptimizeArtistImage(resolved.imageUrl, headlinerId, {
      filename: targetFilename,
      flattenBackground: '#141414',
    }),
    source: 'web',
    query: resolved.query,
    title: resolved.title,
    localFilename: targetFilename,
  };
}

export async function resolveHeadlinerGroupImage(
  headliner: Headliner,
  allHeadliners: Headliner[],
  options?: HeadlinerImageSyncOptions,
): Promise<HeadlinerImageFetchResult | null> {
  const bustCache = Boolean(options?.force);
  const names = collectGroupIdentityNames(headliner, allHeadliners);
  const group = getHeadlinerGroup(allHeadliners, headliner.id);

  if (bustCache) {
    await deleteGroupStoredImages(group);
  }

  if (!bustCache) {
    const fest = await tryFestArtistImage(names, headliner.id, bustCache);
    if (fest) {
      return fest;
    }

    const cached = await tryCachedProfileImage(headliner, bustCache);
    if (cached) {
      return cached;
    }
  }

  return tryWebCoverImage(names, headliner.id, bustCache);
}

export function findGroupImageDonor(group: Headliner[]): Headliner | undefined {
  return group.find((member) => member.imageUrl?.trim());
}

export function getUniqueHeadlinerGroups(headliners: Headliner[]): Headliner[][] {
  const seen = new Set<string>();
  const groups: Headliner[][] = [];

  for (const headliner of headliners) {
    const group = getHeadlinerGroup(headliners, headliner.id);
    const key = groupKey(group);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    groups.push(group);
  }

  return groups;
}
