const EXPO_DEV_PORTS = new Set(['8081', '8082', '19006', '19000']);

export function isLoopbackUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname;
    return isLoopbackHostname(hostname);
  } catch {
    return false;
  }
}

export function isLoopbackHostname(hostname: string): boolean {
  return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname) || hostname.endsWith('.localhost');
}

export function isLocalNetworkHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (isLoopbackHostname(host) || host.endsWith('.local')) return true;
  // Private/link-local IPv6 addresses and RFC 1918/link-local IPv4 addresses.
  if (/^(?:f[cd][0-9a-f]{2}:|fe[89ab][0-9a-f]:)/.test(host)) return true;
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(host)) return false;
  const parts = host.split('.').map(Number);
  if (parts.some(part => part > 255)) return false;
  return parts[0] === 10 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 169 && parts[1] === 254);
}

export function isLocalNetworkUrl(value: string): boolean {
  try { return isLocalNetworkHostname(new URL(value).hostname); }
  catch { return false; }
}

export function isTemporaryPreviewHostname(hostname: string): boolean {
  return /^(?:[a-z0-9-]+\.trycloudflare\.com|[a-z0-9-]+(?:\.app)?\.lhr\.life)$/i.test(hostname);
}

/** Public preview tunnels must use the same isolated local backend as LAN previews. */
export function isIsolatedPreviewUrl(value: string): boolean {
  try { return isLocalNetworkUrl(value) || isTemporaryPreviewHostname(new URL(value).hostname); }
  catch { return false; }
}

type WebApiBaseUrlOptions = {
  hostname: string;
  origin: string;
  port: string;
  configured?: string;
  productionBaseUrl: string;
};

export function resolveWebApiBaseUrl({
  hostname,
  origin,
  port,
  configured,
  productionBaseUrl,
}: WebApiBaseUrlOptions): string {
  const localPage = isLocalNetworkHostname(hostname);
  const expoDevelopmentServer = EXPO_DEV_PORTS.has(port);

  if (isTemporaryPreviewHostname(hostname)) return `${origin}/api`;

  // Loopback pages must never talk to production, even when the shell that
  // created the bundle accidentally supplied a production EXPO_PUBLIC_API_URL.
  if (localPage) {
    if (expoDevelopmentServer) {
      if (!isLoopbackHostname(hostname)) {
        const localApi = new URL(configured && isLocalNetworkUrl(configured) ? configured : 'http://localhost:3000/api');
        if (isLoopbackHostname(localApi.hostname)) localApi.hostname = hostname;
        return localApi.toString().replace(/\/$/, '');
      }
      return configured && isLoopbackUrl(configured)
        ? configured
        : 'http://localhost:3000/api';
    }
    return `${origin}/api`;
  }

  if (configured && !isLoopbackUrl(configured)) {
    return configured;
  }

  return productionBaseUrl;
}
