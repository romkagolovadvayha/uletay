import type { Headliner } from '@/types';
import { syncHeadlinerImage } from './lastfm-images';
import { assertLastFmConfigured, resolveLastFmProfileForHeadliner, sleep } from './lastfm';
import { collectGroupIdentityNames } from './headliner-groups';
import { mergeLastFmProfiles } from './lastfm-merge';

const REQUEST_DELAY_MS = 350;

export async function resolveAndMergeLastFmForHeadliner(
  headliner: Headliner,
  allHeadliners: Headliner[],
  options: { strict?: boolean } = {},
): Promise<Headliner['lastfm'] | null> {
  const names = collectGroupIdentityNames(headliner, allHeadliners);
  const profiles = [];

  for (const name of names) {
    const profile = await resolveLastFmProfileForHeadliner(name, options);
    if (profile) {
      profiles.push(profile);
    }
    if (names.length > 1) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  return mergeLastFmProfiles(profiles, headliner.name) ?? null;
}

export async function enrichHeadlinerFromLastFm(
  headliner: Headliner,
  allHeadliners: Headliner[],
): Promise<Headliner> {
  try {
    assertLastFmConfigured();
  } catch {
    return headliner;
  }

  const profile = await resolveAndMergeLastFmForHeadliner(headliner, allHeadliners);
  if (!profile) {
    return headliner;
  }

  let imageUrl = headliner.imageUrl;
  if (!imageUrl) {
    try {
      const synced = await syncHeadlinerImage(headliner.id, headliner.name, profile);
      if (synced) {
        imageUrl = synced.imageUrl;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Last.fm image sync failed for ${headliner.name}: ${message}`);
    }
  }

  return {
    ...headliner,
    ...(imageUrl ? { imageUrl } : {}),
    lastfm: profile,
  };
}
