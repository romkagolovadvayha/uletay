import { fetch as undiciFetch, ProxyAgent, type RequestInit } from 'undici';

const USER_AGENT = 'UletayFest/1.0 (+https://uletayapp.ru)';
const DIRECT_REQUEST_TIMEOUT_MS = 30_000;
const PROXY_CONNECT_TIMEOUT_MS = 45_000;
const PROXY_REQUEST_TIMEOUT_MS = 90_000;
const MAX_ATTEMPTS = 3;

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

function isTimeoutError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('AbortError') ||
    message.includes('Timeout') ||
    message.includes('timed out') ||
    message.includes('TimeoutError')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function lastFmFetchOnce(url: string | URL, proxyUrl?: string) {
  const requestTimeoutMs = proxyUrl ? PROXY_REQUEST_TIMEOUT_MS : DIRECT_REQUEST_TIMEOUT_MS;
  const init: RequestInit = {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json,text/javascript,*/*;q=0.1',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(requestTimeoutMs),
  };

  if (proxyUrl) {
    init.dispatcher = new ProxyAgent({
      uri: proxyUrl,
      connectTimeout: PROXY_CONNECT_TIMEOUT_MS,
      bodyTimeout: PROXY_REQUEST_TIMEOUT_MS,
      headersTimeout: PROXY_REQUEST_TIMEOUT_MS,
    });
  }

  return undiciFetch(url, init);
}

export async function lastFmFetch(url: string | URL) {
  const proxyUrl = resolveLastFmProxyUrl();
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await lastFmFetchOnce(url, proxyUrl);
    } catch (error) {
      lastError = error;
      if (isTimeoutError(error) && attempt < MAX_ATTEMPTS) {
        console.warn(`Last.fm request attempt ${attempt}/${MAX_ATTEMPTS} timed out, retrying...`);
        await sleep(1500 * attempt);
        continue;
      }
      break;
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  if (isTimeoutError(lastError)) {
    const viaProxy = proxyUrl ? ` via proxy ${maskProxyUrl(proxyUrl)}` : '';
    const timeoutMs = proxyUrl ? PROXY_REQUEST_TIMEOUT_MS : DIRECT_REQUEST_TIMEOUT_MS;
    throw new Error(
      `Last.fm request timed out after ${timeoutMs}ms (${MAX_ATTEMPTS} attempts)${viaProxy}. ` +
        'Check VPS can reach the proxy: curl -x "$LASTFM_PROXY_URL" -m 30 -I https://ws.audioscrobbler.com/',
    );
  }

  throw lastError instanceof Error ? lastError : new Error(message);
}
