import { API_BASE_URL } from '../config/api';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { fetchRadioNowPlayingFromStream, RadioNowPlaying } from '../utils/radioIcy';

export type { RadioNowPlaying };

const FETCH_TIMEOUT_MS = 10_000;

async function fetchRadioNowPlayingFromApi(): Promise<RadioNowPlaying | null> {
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

    return (await response.json()) as RadioNowPlaying;
  } catch {
    return null;
  }
}

export async function fetchRadioNowPlaying(): Promise<RadioNowPlaying> {
  const fromStream = await fetchRadioNowPlayingFromStream().catch(() => null);
  if (fromStream?.raw || fromStream?.title || fromStream?.artist) {
    return fromStream;
  }

  const fromApi = await fetchRadioNowPlayingFromApi();
  if (fromApi?.raw || fromApi?.title || fromApi?.artist) {
    return fromApi;
  }

  throw new Error('Не удалось получить название трека');
}
