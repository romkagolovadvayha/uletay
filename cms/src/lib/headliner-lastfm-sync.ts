import type { Headliner } from '@/types';
import { syncHeadlinerImage } from './lastfm-images';
import { assertLastFmConfigured, resolveLastFmProfileForHeadliner } from './lastfm';

export async function enrichHeadlinerFromLastFm(headliner: Headliner): Promise<Headliner> {
  try {
    assertLastFmConfigured();
  } catch {
    return headliner;
  }

  const profile = await resolveLastFmProfileForHeadliner(headliner.name);
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
