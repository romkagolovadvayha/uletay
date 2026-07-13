import { copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Headliner } from '@/types';
import { config } from './config';
import { resolveMusicCoverImageUrl } from './duckduckgo-images';
import { lookupFestArtistUploadUrl } from './fest-artist-sources';
import { collectGroupIdentityNames, getHeadlinerGroup } from './headliner-groups';
import {
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
};

function groupKey(group: Headliner[]): string {
  return group
    .map((item) => item.id)
    .sort()
    .join('|');
}

async function copyHeadlinerImageFile(fromHeadlinerId: string, toHeadlinerId: string): Promise<string> {
  const fromFile = path.join(config.uploadDir, 'images', headlinerImageFilename(fromHeadlinerId));
  const toFile = path.join(config.uploadDir, 'images', headlinerImageFilename(toHeadlinerId));
  await copyFile(fromFile, toFile);
  return `${config.uploadUrl}/images/${headlinerImageFilename(toHeadlinerId)}`;
}

export async function propagateHeadlinerImageToGroup(
  sourceHeadlinerId: string,
  sourceImageUrl: string,
  group: Headliner[],
): Promise<Record<string, string>> {
  const updates: Record<string, string> = {
    [sourceHeadlinerId]: sourceImageUrl,
  };

  for (const member of group) {
    if (member.id === sourceHeadlinerId) {
      continue;
    }
    updates[member.id] = await copyHeadlinerImageFile(sourceHeadlinerId, member.id);
  }

  return updates;
}

async function tryFestArtistImage(
  names: string[],
  headlinerId: string,
): Promise<HeadlinerImageFetchResult | null> {
  for (const name of names) {
    const sourceUrl = lookupFestArtistUploadUrl(name);
    if (!sourceUrl) {
      continue;
    }

    const uploadMatch = sourceUrl.match(/\/api\/uploads\/images\/(.+)$/);
    if (uploadMatch?.[1]) {
      const localSource = path.join(config.uploadDir, 'images', uploadMatch[1]);
      if (existsSync(localSource)) {
        const target = path.join(config.uploadDir, 'images', headlinerImageFilename(headlinerId));
        await copyFile(localSource, target);
        return {
          imageUrl: `${config.uploadUrl}/images/${headlinerImageFilename(headlinerId)}`,
          source: 'fest-artist',
        };
      }
    }

    if (sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://')) {
      return {
        imageUrl: await downloadAndOptimizeArtistImage(sourceUrl, headlinerId),
        source: 'fest-artist',
      };
    }
  }

  return null;
}

async function tryCachedProfileImage(
  headliner: Headliner,
): Promise<HeadlinerImageFetchResult | null> {
  const lastFmUrl = pickLastFmImageUrl(headliner.lastfm?.images);
  if (lastFmUrl) {
    return {
      imageUrl: await downloadAndOptimizeArtistImage(lastFmUrl, headliner.id),
      source: 'lastfm',
    };
  }

  const synced = await syncHeadlinerImage(headliner.id, headliner.name, headliner.lastfm);
  if (!synced) {
    return null;
  }

  return {
    imageUrl: synced.imageUrl,
    source: synced.source,
  };
}

async function tryWebCoverImage(
  names: string[],
  headlinerId: string,
): Promise<HeadlinerImageFetchResult | null> {
  const resolved = await resolveMusicCoverImageUrl(names);
  if (!resolved) {
    return null;
  }

  return {
    imageUrl: await downloadAndOptimizeArtistImage(resolved.imageUrl, headlinerId),
    source: 'web',
    query: resolved.query,
    title: resolved.title,
  };
}

export async function resolveHeadlinerGroupImage(
  headliner: Headliner,
  allHeadliners: Headliner[],
): Promise<HeadlinerImageFetchResult | null> {
  const names = collectGroupIdentityNames(headliner, allHeadliners);

  const fest = await tryFestArtistImage(names, headliner.id);
  if (fest) {
    return fest;
  }

  const cached = await tryCachedProfileImage(headliner);
  if (cached) {
    return cached;
  }

  return tryWebCoverImage(names, headliner.id);
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
