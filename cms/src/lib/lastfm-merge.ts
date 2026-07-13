import type {
  HeadlinerLastFmImage,
  HeadlinerLastFmProfile,
  HeadlinerLastFmSimilarArtist,
  HeadlinerLastFmTag,
  HeadlinerLastFmTrack,
} from '@/lastfm-types';
import { LASTFM_CLIENT_TOP_TRACKS_LIMIT } from './lastfm-tracks';

function normalizeArtistKey(name: string): string {
  return name
    .toUpperCase()
    .replace(/Ё/g, 'Е')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTrackKey(name: string): string {
  return name.toLocaleLowerCase('ru').replace(/\s+/g, ' ').trim();
}

function profileKey(profile: HeadlinerLastFmProfile): string {
  if (profile.mbid) {
    return `mbid:${profile.mbid}`;
  }
  return `name:${normalizeArtistKey(profile.name)}`;
}

function dedupeProfiles(profiles: HeadlinerLastFmProfile[]): HeadlinerLastFmProfile[] {
  const seen = new Map<string, HeadlinerLastFmProfile>();
  for (const profile of profiles) {
    const key = profileKey(profile);
    const existing = seen.get(key);
    if (!existing || (profile.listeners ?? 0) > (existing.listeners ?? 0)) {
      seen.set(key, profile);
    }
  }
  return [...seen.values()];
}

function mergeTopTracks(profiles: HeadlinerLastFmProfile[]): {
  tracks: HeadlinerLastFmTrack[];
  total: number;
} {
  const tracks = new Map<string, HeadlinerLastFmTrack>();

  for (const profile of profiles) {
    for (const track of profile.topTracks) {
      const key = normalizeTrackKey(track.name);
      const existing = tracks.get(key);
      if (!existing) {
        tracks.set(key, { ...track });
        continue;
      }

      tracks.set(key, {
        ...existing,
        playcount: (existing.playcount ?? 0) + (track.playcount ?? 0),
        listeners: Math.max(existing.listeners ?? 0, track.listeners ?? 0),
        durationSec: existing.durationSec ?? track.durationSec,
        url: existing.url ?? track.url,
        mbid: existing.mbid ?? track.mbid,
      });
    }
  }

  const merged = [...tracks.values()]
    .sort((a, b) => {
      const playDiff = (b.playcount ?? 0) - (a.playcount ?? 0);
      if (playDiff !== 0) {
        return playDiff;
      }
      const listenerDiff = (b.listeners ?? 0) - (a.listeners ?? 0);
      if (listenerDiff !== 0) {
        return listenerDiff;
      }
      return a.name.localeCompare(b.name, 'ru');
    })
    .map((track, index) => ({ ...track, rank: index + 1 }));

  const total = Math.max(
    merged.length,
    ...profiles.map((profile) => profile.topTracksTotal ?? profile.topTracks.length),
  );

  return {
    tracks: merged.slice(0, LASTFM_CLIENT_TOP_TRACKS_LIMIT),
    total,
  };
}

function mergeTags(profiles: HeadlinerLastFmProfile[]): HeadlinerLastFmTag[] {
  const tags = new Map<string, HeadlinerLastFmTag>();
  for (const profile of profiles) {
    for (const tag of profile.tags) {
      if (!tags.has(tag.name)) {
        tags.set(tag.name, tag);
      }
    }
  }
  return [...tags.values()].slice(0, 12);
}

function mergeSimilarArtists(profiles: HeadlinerLastFmProfile[]): HeadlinerLastFmSimilarArtist[] {
  const artists = new Map<string, HeadlinerLastFmSimilarArtist>();
  for (const profile of profiles) {
    for (const artist of profile.similarArtists) {
      if (!artists.has(artist.name)) {
        artists.set(artist.name, artist);
      }
    }
  }
  return [...artists.values()].slice(0, 8);
}

function pickBestImages(profiles: HeadlinerLastFmProfile[]): HeadlinerLastFmImage[] {
  const sorted = [...profiles].sort((a, b) => (b.listeners ?? 0) - (a.listeners ?? 0));
  for (const profile of sorted) {
    if (profile.images?.length) {
      return profile.images;
    }
  }
  return [];
}

export function mergeLastFmProfiles(
  profiles: HeadlinerLastFmProfile[],
  primaryName?: string,
): HeadlinerLastFmProfile | undefined {
  const unique = dedupeProfiles(profiles.filter(Boolean));
  if (!unique.length) {
    return undefined;
  }

  const primary =
    unique.find((profile) => normalizeArtistKey(profile.name) === normalizeArtistKey(primaryName ?? '')) ??
    unique[0];
  const mergedTracks = mergeTopTracks(unique);

  return {
    mbid: primary.mbid,
    name: primary.name,
    url: primary.url,
    listeners: unique.reduce((sum, profile) => sum + (profile.listeners ?? 0), 0),
    playcount: unique.reduce((sum, profile) => sum + (profile.playcount ?? 0), 0),
    onTour: unique.some((profile) => profile.onTour),
    bioSummary: primary.bioSummary,
    bioPublished: primary.bioPublished,
    tags: mergeTags(unique),
    similarArtists: mergeSimilarArtists(unique),
    topTracks: mergedTracks.tracks,
    topTracksTotal: mergedTracks.total,
    images: pickBestImages(unique),
    updatedAt: new Date().toISOString(),
    searchQuery: primary.searchQuery,
  };
}
