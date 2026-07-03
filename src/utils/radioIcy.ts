import { RADIO_STREAM_URL } from '../config/radio';
import { fetchWithTimeout } from './fetchWithTimeout';

export type RadioNowPlaying = {
  title: string;
  artist: string;
  raw: string;
};

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

export async function fetchRadioNowPlayingFromStream(
  streamUrl = RADIO_STREAM_URL,
): Promise<RadioNowPlaying | null> {
  const response = await fetchWithTimeout(
    streamUrl,
    {
      headers: {
        'Icy-MetaData': '1',
        'User-Agent': 'UletayRadioApp/1.0',
      },
    },
    10_000,
  );

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
