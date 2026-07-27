const RADIO_STREAM_URL = 'https://uletayradio.hostingradio.ru/uletayradio256.mp3';

export type RadioNowPlaying = {
  title: string;
  artist: string;
  raw: string;
};

export type RadioHistoryItem = RadioNowPlaying & { playedAt: string };
export type RadioSnapshot = RadioNowPlaying & { recent: RadioHistoryItem[] };

const CACHE_TTL_MS = 15_000;
const MAX_HISTORY = 20;
let cachedSnapshot: RadioSnapshot | null = null;
let cachedAt = 0;
let inflight: Promise<RadioSnapshot | null> | null = null;

function decodeIcyMetadata(bytes: Uint8Array): string {
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) {
    end -= 1;
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, end));
}

function parseStreamTitle(raw: string): { title: string; artist: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { title: '', artist: '' };
  }

  const separator = ' - ';
  const splitIndex = trimmed.indexOf(separator);
  if (splitIndex === -1) {
    return { title: trimmed, artist: '' };
  }

  return {
    artist: trimmed.slice(0, splitIndex).trim(),
    title: trimmed.slice(splitIndex + separator.length).trim(),
  };
}

export async function fetchRadioNowPlaying(
  streamUrl = RADIO_STREAM_URL,
): Promise<RadioNowPlaying | null> {
  const response = await fetch(streamUrl, {
    headers: {
      'Icy-MetaData': '1',
      'User-Agent': 'UletayRadioApp/1.0',
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok || !response.body) {
    return null;
  }

  const metaInterval = Number.parseInt(response.headers.get('icy-metaint') ?? '0', 10);
  if (!metaInterval) {
    return null;
  }

  const reader = response.body.getReader();
  let buffer = new Uint8Array(0);

  try {
    while (buffer.length < metaInterval + 1) {
      const { done, value } = await reader.read();
      if (done || !value) {
        return null;
      }

      const next = new Uint8Array(buffer.length + value.length);
      next.set(buffer);
      next.set(value, buffer.length);
      buffer = next;
    }

    const metadataLength = buffer[metaInterval] * 16;
    const needed = metaInterval + 1 + metadataLength;

    while (buffer.length < needed) {
      const { done, value } = await reader.read();
      if (done || !value) {
        return null;
      }

      const next = new Uint8Array(buffer.length + value.length);
      next.set(buffer);
      next.set(value, buffer.length);
      buffer = next;
    }

    const metadataBytes = buffer.slice(metaInterval + 1, needed);
    const metadata = decodeIcyMetadata(metadataBytes);
    const streamTitle = metadata.match(/StreamTitle='([^']*)'/)?.[1]?.trim() ?? '';
    const parsed = parseStreamTitle(streamTitle);

    return {
      ...parsed,
      raw: streamTitle,
    };
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

export async function getRadioSnapshot(): Promise<RadioSnapshot | null> {
  if (cachedSnapshot && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedSnapshot;
  }
  if (inflight) return inflight;

  inflight = fetchRadioNowPlaying()
    .then((current) => {
      if (!current) return cachedSnapshot;
      const previous = cachedSnapshot?.recent ?? [];
      const changed = !cachedSnapshot || cachedSnapshot.raw !== current.raw;
      const recent = changed && cachedSnapshot?.raw
        ? [
            {
              title: cachedSnapshot.title,
              artist: cachedSnapshot.artist,
              raw: cachedSnapshot.raw,
              playedAt: new Date().toISOString(),
            },
            ...previous,
          ].filter(
            (item, index, all) =>
              all.findIndex((candidate) => candidate.raw === item.raw) === index,
          ).slice(0, MAX_HISTORY)
        : previous;
      cachedSnapshot = { ...current, recent };
      cachedAt = Date.now();
      return cachedSnapshot;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
