import { API_BASE_URL } from '../config/api';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { fetchRadioNowPlayingFromStream, RadioNowPlaying } from '../utils/radioIcy';

export type { RadioNowPlaying };
export type RadioHistoryItem = RadioNowPlaying & { playedAt: string };
export type RadioSnapshot = RadioNowPlaying & { recent: RadioHistoryItem[] };

const FETCH_TIMEOUT_MS = 10_000;

async function fetchRadioNowPlayingFromApi(): Promise<RadioSnapshot | null> {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/radio/now-playing`,
      { headers: { Accept: 'application/json' } },
      FETCH_TIMEOUT_MS,
    );

    const contentType = response.headers.get('content-type') ?? '';
    if (!response.ok || !contentType.includes('application/json')) {
      return null;
    }

    const result = (await response.json()) as RadioSnapshot;
    return { ...result, recent: Array.isArray(result.recent) ? result.recent.slice(0, 20) : [] };
  } catch {
    return null;
  }
}

export async function fetchRadioNowPlaying(): Promise<RadioSnapshot> {
  const fromApi = await fetchRadioNowPlayingFromApi();
  if (fromApi?.raw || fromApi?.title || fromApi?.artist) {
    return fromApi;
  }

  const fromStream = await fetchRadioNowPlayingFromStream().catch(() => null);
  if (fromStream?.raw || fromStream?.title || fromStream?.artist) {
    return { ...fromStream, recent: [] };
  }

  throw new Error('Не удалось получить название трека');
}
