import type { Headliner } from '../src/types';
import { getHeadlinerGroupPopularity } from '../src/utils/headlinerGroups';

export function compareHeadlinerPopularity(a: Headliner, b: Headliner, allHeadliners: Headliner[]): number {
  const aStats = getHeadlinerGroupPopularity(a, allHeadliners);
  const bStats = getHeadlinerGroupPopularity(b, allHeadliners);
  const listenersDiff = bStats.listeners - aStats.listeners;
  if (listenersDiff !== 0) return listenersDiff;

  const playcountDiff = bStats.playcount - aStats.playcount;
  if (playcountDiff !== 0) return playcountDiff;

  return a.name.localeCompare(b.name, 'ru');
}

/** Shared by the app catalog and the VK showcase so their order stays identical. */
export function sortHeadlinersByPopularity(headliners: Headliner[]): Headliner[] {
  return [...headliners].sort((a, b) => compareHeadlinerPopularity(a, b, headliners));
}
