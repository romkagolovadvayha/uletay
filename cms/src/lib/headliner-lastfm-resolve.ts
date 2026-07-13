import type { Headliner } from '@/types';
import type { HeadlinerLastFmProfile } from '@/lastfm-types';
import { getHeadlinerGroup } from './headliner-groups';
import { mergeLastFmProfiles } from './lastfm-merge';

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

export function resolveAllHeadlinerLastFm(headliners: Headliner[]): Headliner[] {
  return headliners.map((headliner) => {
    const lastfm = resolveHeadlinerLastFm(headliner, headliners);
    if (!lastfm) {
      return headliner;
    }
    return { ...headliner, lastfm };
  });
}
