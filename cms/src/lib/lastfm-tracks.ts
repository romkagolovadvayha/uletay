import type { HeadlinerLastFmProfile } from '@/lastfm-types';

export const LASTFM_CLIENT_TOP_TRACKS_LIMIT = 6;

function limitTopTracks(profile: HeadlinerLastFmProfile): HeadlinerLastFmProfile['topTracks'] {
  const tracks = profile.topTracks ?? [];
  return tracks.slice(0, LASTFM_CLIENT_TOP_TRACKS_LIMIT).map((track, index) => ({
    name: track.name,
    rank: track.rank || index + 1,
    playcount: track.playcount,
    listeners: track.listeners,
    durationSec: track.durationSec,
    artistName: track.artistName,
  }));
}

/** Normalize stored/admin profiles: cap tracks, drop Last.fm page URLs. Keep mbid/images for CMS. */
export function trimLastFmTopTracks(profile: HeadlinerLastFmProfile): HeadlinerLastFmProfile {
  const tracks = profile.topTracks ?? [];
  const total = Math.max(profile.topTracksTotal ?? 0, tracks.length);
  const limited = limitTopTracks(profile);

  return {
    mbid: profile.mbid,
    name: profile.name,
    listeners: profile.listeners,
    playcount: profile.playcount,
    onTour: profile.onTour,
    bioSummary: profile.bioSummary,
    bioPublished: profile.bioPublished,
    tags: (profile.tags ?? []).map((tag) => ({ name: tag.name })),
    similarArtists: (profile.similarArtists ?? []).map((artist) => ({ name: artist.name })),
    topTracks: limited,
    topTracksTotal: total || limited.length,
    images: profile.images,
    updatedAt: profile.updatedAt,
    searchQuery: profile.searchQuery,
  };
}

/** Public /api/data shape: no Last.fm links, CDN thumbs, or MusicBrainz ids. */
export function toClientLastFmProfile(profile: HeadlinerLastFmProfile): HeadlinerLastFmProfile {
  const trimmed = trimLastFmTopTracks(profile);
  return {
    name: trimmed.name,
    listeners: trimmed.listeners,
    playcount: trimmed.playcount,
    onTour: trimmed.onTour,
    bioSummary: trimmed.bioSummary,
    bioPublished: trimmed.bioPublished,
    tags: trimmed.tags,
    similarArtists: trimmed.similarArtists,
    topTracks: trimmed.topTracks,
    topTracksTotal: trimmed.topTracksTotal,
    updatedAt: trimmed.updatedAt,
    searchQuery: trimmed.searchQuery,
  };
}

export function getLastFmTopTracksMoreCount(profile: HeadlinerLastFmProfile): number {
  const shown = profile.topTracks?.length ?? 0;
  const total = profile.topTracksTotal ?? shown;
  return Math.max(0, total - shown);
}
