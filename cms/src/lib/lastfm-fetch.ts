import { fetch as undiciFetch, Pool, ProxyAgent, type RequestInit } from 'undici';
import { setTimeout as delay } from 'node:timers/promises';

const USER_AGENT = 'UletayFest/1.0 (+https://uletayapp.ru)';
const REQUEST_TIMEOUT_MS = 12_000;
const PROXY_CONNECT_TIMEOUT_MS = 8_000;
const MAX_ATTEMPTS = 3;
let proxyDispatcher: { url: string; agent: ProxyAgent } | undefined;

export type LastFmRequestOptions = { signal?: AbortSignal };

function getProxyDispatcher(url: string): ProxyAgent {
  if (proxyDispatcher?.url !== url) {
    void proxyDispatcher?.agent.close().catch(() => {});
    proxyDispatcher = {
      url,
      agent: new ProxyAgent({
        uri: url,
        connections: 2,
        proxyTls: { timeout: PROXY_CONNECT_TIMEOUT_MS },
        requestTls: { timeout: PROXY_CONNECT_TIMEOUT_MS },
        headersTimeout: REQUEST_TIMEOUT_MS,
        bodyTimeout: REQUEST_TIMEOUT_MS,
        // CONNECT uses a separate pool; target timeouts do not apply to it.
        clientFactory: (origin, options) => new Pool(origin, {
          ...options,
          headersTimeout: PROXY_CONNECT_TIMEOUT_MS,
          bodyTimeout: PROXY_CONNECT_TIMEOUT_MS,
        }),
      }),
    };
  }
  return proxyDispatcher.agent;
}

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
  if (!(error instanceof Error)) return false;
  return error.name === 'TimeoutError' || /timeout|timed out/i.test(error.message) ||
    (error.cause !== undefined && isTimeoutError(error.cause));
}

async function lastFmFetchOnce(url: string | URL, proxyUrl: string | undefined, options: LastFmRequestOptions) {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const init: RequestInit = {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json,text/javascript,*/*;q=0.1',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    redirect: 'follow',
    signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
  };

  if (proxyUrl) {
    init.dispatcher = getProxyDispatcher(proxyUrl);
  }

  return undiciFetch(url, init);
}

export async function lastFmFetch(url: string | URL, options: LastFmRequestOptions = {}) {
  const proxyUrl = resolveLastFmProxyUrl();
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    options.signal?.throwIfAborted();
    try {
      return await lastFmFetchOnce(url, proxyUrl, options);
    } catch (error) {
      options.signal?.throwIfAborted();
      lastError = error;
      if (isTimeoutError(error) && attempt < MAX_ATTEMPTS) {
        console.warn(`Last.fm request attempt ${attempt}/${MAX_ATTEMPTS} timed out, retrying...`);
        await delay(350 * attempt, undefined, { signal: options.signal });
        continue;
      }
      break;
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  if (isTimeoutError(lastError)) {
    const viaProxy = proxyUrl ? ` via proxy ${maskProxyUrl(proxyUrl)}` : '';
    throw new Error(
      `Last.fm request timed out after ${REQUEST_TIMEOUT_MS}ms (${MAX_ATTEMPTS} attempts)${viaProxy}. ` +
        'Check VPS can reach the proxy: curl -x "$LASTFM_PROXY_URL" -m 30 -I https://ws.audioscrobbler.com/',
    );
  }

  throw lastError instanceof Error ? lastError : new Error(message);
}
