import { fetch as undiciFetch, ProxyAgent, type RequestInit } from 'undici';

const USER_AGENT = 'UletayFest/1.0 (+https://uletayapp.ru)';
const REQUEST_TIMEOUT_MS = 30_000;
const CONNECT_TIMEOUT_MS = 15_000;

export function resolveLastFmProxyUrl(): string | undefined {
  const explicit = process.env.LASTFM_PROXY_URL?.trim();
  if (explicit) {
    return explicit;
  }

  return process.env.HTTPS_PROXY?.trim() || process.env.HTTP_PROXY?.trim() || undefined;
}

export function maskProxyUrl(proxyUrl: string): string {
  try {
    const parsed = new URL(proxyUrl);
    if (parsed.username) {
      parsed.username = '***';
    }
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    return '(invalid proxy url)';
  }
}

export async function lastFmFetch(url: string | URL) {
  const proxyUrl = resolveLastFmProxyUrl();
  const init: RequestInit = {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json,text/javascript,*/*;q=0.1',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  };

  if (proxyUrl) {
    init.dispatcher = new ProxyAgent({
      uri: proxyUrl,
      connectTimeout: CONNECT_TIMEOUT_MS,
      bodyTimeout: REQUEST_TIMEOUT_MS,
      headersTimeout: REQUEST_TIMEOUT_MS,
    });
  }

  try {
    return await undiciFetch(url, init);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('AbortError') || message.includes('Timeout') || message.includes('timed out')) {
      const viaProxy = proxyUrl ? ` via proxy ${maskProxyUrl(proxyUrl)}` : '';
      throw new Error(`Last.fm request timed out after ${REQUEST_TIMEOUT_MS}ms${viaProxy}`);
    }
    throw error;
  }
}
