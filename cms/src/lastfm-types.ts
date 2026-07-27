export interface HeadlinerLastFmImage {
  url: string;
  size: string;
}

export interface HeadlinerLastFmTag {
  name: string;
}

export interface HeadlinerLastFmSimilarArtist {
  name: string;
}

export interface HeadlinerLastFmTrack {
  name: string;
  rank: number;
  playcount?: number;
  listeners?: number;
  durationSec?: number;
  artistName?: string;
}

export interface HeadlinerLastFmProfile {
  /** Used by CMS image sync (MusicBrainz); stripped from public /api/data. */
  mbid?: string;
  name: string;
  listeners?: number;
  playcount?: number;
  onTour?: boolean;
  bioSummary?: string;
  bioPublished?: string;
  tags: HeadlinerLastFmTag[];
  similarArtists: HeadlinerLastFmSimilarArtist[];
  topTracks: HeadlinerLastFmTrack[];
  topTracksTotal?: number;
  /** CMS-only Last.fm CDN thumbs; stripped from the public /api/data payload. */
  images?: HeadlinerLastFmImage[];
  updatedAt: string;
  searchQuery?: string;
}
