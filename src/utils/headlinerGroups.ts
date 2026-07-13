import type { Headliner } from '../types';
import type { HeadlinerLastFmProfile } from '../types/lastfm';
import { mergeLastFmProfiles } from './lastfmMerge';

export function getHeadlinerGroup(headliners: Headliner[], headlinerId: string): Headliner[] {
  const byId = new Map(headliners.map((item) => [item.id, item]));
  const start = byId.get(headlinerId);
  if (!start) {
    return [];
  }

  const visited = new Set<string>([headlinerId]);
  const queue = [...(start.linkedHeadlinerIds ?? [])];

  while (queue.length > 0) {
    const id = queue.pop();
    if (!id || visited.has(id)) {
      continue;
    }
    visited.add(id);
    const member = byId.get(id);
    if (!member) {
      continue;
    }
    for (const linkedId of member.linkedHeadlinerIds ?? []) {
      if (!visited.has(linkedId)) {
        queue.push(linkedId);
      }
    }
  }

  return [...visited]
    .map((id) => byId.get(id))
    .filter((item): item is Headliner => Boolean(item));
}

export function resolveHeadlinerLastFm(
  headliner: Headliner,
  allHeadliners: Headliner[],
): HeadlinerLastFmProfile | undefined {
  const group = getHeadlinerGroup(allHeadliners, headliner.id);
  const profiles = group
    .map((member) => member.lastfm)
    .filter((profile): profile is HeadlinerLastFmProfile => Boolean(profile));

  if (!profiles.length) {
    return headliner.lastfm;
  }

  return mergeLastFmProfiles(profiles, headliner.name) ?? headliner.lastfm;
}

export function withResolvedHeadlinerLastFm(headliner: Headliner, allHeadliners: Headliner[]): Headliner {
  const lastfm = resolveHeadlinerLastFm(headliner, allHeadliners);
  if (!lastfm) {
    return headliner;
  }
  return { ...headliner, lastfm };
}

export function getHeadlinerGroupPopularity(
  headliner: Headliner,
  allHeadliners: Headliner[],
): { listeners: number; playcount: number } {
  const lastfm = resolveHeadlinerLastFm(headliner, allHeadliners);
  return {
    listeners: lastfm?.listeners ?? 0,
    playcount: lastfm?.playcount ?? 0,
  };
}
