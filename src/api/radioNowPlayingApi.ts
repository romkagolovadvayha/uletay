import { API_BASE_URL } from '../config/api';
import { RADIO_STATION_ID } from '../config/radio';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import type { RadioSnapshot } from '../utils/radioSnapshot';

export type { RadioNowPlaying, RadioSnapshot } from '../utils/radioSnapshot';

export async function fetchRadioNowPlaying(): Promise<RadioSnapshot> {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/radio/now-playing`,
    { headers: { Accept: 'application/json' }, cache: 'no-store' },
    10_000,
  );
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Radio service unavailable');
  }
  const result = await response.json() as RadioSnapshot;
  // Reject old CMS/ICY responses during deployment: never mix stations.
  if (result.source !== 'liscase' || result.stationId !== RADIO_STATION_ID
    || typeof result.available !== 'boolean' || !Array.isArray(result.queue)) {
    throw new Error('Invalid radio station response');
  }
  return result;
}
