import type { HeadlinerLastFmProfile } from '@/lastfm-types';

export const LASTFM_CLIENT_TOP_TRACKS_LIMIT = 15;

export function trimLastFmTopTracks(profile: HeadlinerLastFmProfile): HeadlinerLastFmProfile {
  const tracks = profile.topTracks ?? [];
  const total = Math.max(profile.topTracksTotal ?? 0, tracks.length);
  const limited = tracks.slice(0, LASTFM_CLIENT_TOP_TRACKS_LIMIT);

  return {
    ...profile,
    topTracks: limited,
    topTracksTotal: total || limited.length,
  };
}

export function getLastFmTopTracksMoreCount(profile: HeadlinerLastFmProfile): number {
  const shown = profile.topTracks?.length ?? 0;
  const total = profile.topTracksTotal ?? shown;
  return Math.max(0, total - shown);
}
