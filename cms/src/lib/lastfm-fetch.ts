import { fetch as undiciFetch, ProxyAgent, type RequestInit } from 'undici';

const USER_AGENT = 'UletayFest/1.0 (+https://uletayapp.ru)';

export function resolveLastFmProxyUrl(): string | undefined {
  const explicit = process.env.LASTFM_PROXY_URL?.trim();
  if (explicit) {
    return explicit;
  }

  return process.env.HTTPS_PROXY?.trim() || process.env.HTTP_PROXY?.trim() || undefined;
}

export async function lastFmFetch(url: string | URL) {
  const init: RequestInit = {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json,text/javascript,*/*;q=0.1',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    redirect: 'follow',
  };

  const proxyUrl = resolveLastFmProxyUrl();
  if (proxyUrl) {
    init.dispatcher = new ProxyAgent(proxyUrl);
  }

  return undiciFetch(url, init);
}
