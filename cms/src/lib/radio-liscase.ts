import { RADIO_STATE_URL } from '../../../src/config/radio';
import { parseLiscaseRadioSnapshot, type RadioSnapshot } from '../../../src/utils/radioSnapshot';

const CACHE_TTL_MS = 3_000;
let cachedSnapshot: RadioSnapshot | null = null;
let cachedAt = 0;
let inflight: Promise<RadioSnapshot> | null = null;

/** Share upstream requests between listeners. Never serve stale metadata as live. */
export async function getRadioSnapshot(): Promise<RadioSnapshot> {
  if (cachedSnapshot && Date.now() - cachedAt < CACHE_TTL_MS) return cachedSnapshot;
  if (inflight) return inflight;
  inflight = (async () => {
    const response = await fetch(RADIO_STATE_URL, {
      headers: { Accept: 'application/json' }, cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error('Radio service unavailable');
    const snapshot = parseLiscaseRadioSnapshot(await response.json());
    cachedSnapshot = snapshot;
    cachedAt = Date.now();
    return snapshot;
  })().finally(() => { inflight = null; });
  return inflight;
}
