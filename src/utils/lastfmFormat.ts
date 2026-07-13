export function formatLastFmCount(value?: number): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }
  return value.toLocaleString('ru-RU');
}

type PopularTrack = {
  rank: number;
  playcount?: number;
  listeners?: number;
};

export function sortTracksByPopularity<T extends PopularTrack>(tracks: T[]): T[] {
  return [...tracks]
    .sort((a, b) => {
      const playDiff = (b.playcount ?? 0) - (a.playcount ?? 0);
      if (playDiff !== 0) {
        return playDiff;
      }
      const listenerDiff = (b.listeners ?? 0) - (a.listeners ?? 0);
      if (listenerDiff !== 0) {
        return listenerDiff;
      }
      return a.rank - b.rank;
    })
    .map((track, index) => ({ ...track, rank: index + 1 }));
}

export function formatTrackDuration(durationSec?: number): string | null {
  if (!durationSec || !Number.isFinite(durationSec) || durationSec <= 0) {
    return null;
  }

  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
