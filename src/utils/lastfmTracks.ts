import type { HeadlinerLastFmProfile } from '../types/lastfm';

export const LASTFM_CLIENT_TOP_TRACKS_LIMIT = 6;

export function getLastFmTopTracksMoreCount(profile: HeadlinerLastFmProfile): number {
  const shown = profile.topTracks?.length ?? 0;
  const total = profile.topTracksTotal ?? shown;
  return Math.max(0, total - shown);
}
