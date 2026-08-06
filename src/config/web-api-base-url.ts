const EXPO_DEV_PORTS = new Set(['8081', '8082', '19006', '19000']);

export function isLoopbackUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}

export function isLoopbackHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
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
  const localPage = isLoopbackHostname(hostname);
  const expoDevelopmentServer = EXPO_DEV_PORTS.has(port);

  // Loopback pages must never talk to production, even when the shell that
  // created the bundle accidentally supplied a production EXPO_PUBLIC_API_URL.
  if (localPage) {
    if (expoDevelopmentServer) {
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
