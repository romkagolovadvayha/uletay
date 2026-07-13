export interface HeadlinerLastFmImage {
  url: string;
  size: string;
}

export interface HeadlinerLastFmTag {
  name: string;
  url: string;
}

export interface HeadlinerLastFmSimilarArtist {
  name: string;
  url: string;
}

export interface HeadlinerLastFmTrack {
  name: string;
  rank: number;
  playcount?: number;
  listeners?: number;
  url?: string;
  durationSec?: number;
  mbid?: string;
}

export interface HeadlinerLastFmProfile {
  mbid?: string;
  name: string;
  url?: string;
  listeners?: number;
  playcount?: number;
  onTour?: boolean;
  bioSummary?: string;
  bioPublished?: string;
  tags: HeadlinerLastFmTag[];
  similarArtists: HeadlinerLastFmSimilarArtist[];
  topTracks: HeadlinerLastFmTrack[];
  topTracksTotal?: number;
  images?: HeadlinerLastFmImage[];
  updatedAt: string;
  searchQuery?: string;
}
