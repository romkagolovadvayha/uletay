/** nginx preserves Host and overwrites X-Forwarded-Proto in trusted-proxy mode. */
export function isSameOriginRequest(request: Pick<Request, 'url' | 'headers'>): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const url = new URL(request.url);
    const expectedHost = request.headers.get('host') || url.host;
    const expectedProtocol =
      process.env.TRUST_PROXY === '1'
        ? request.headers.get('x-forwarded-proto') || url.protocol.slice(0, -1)
        : url.protocol.slice(0, -1);
    const source = new URL(origin);
    return (
      ['http:', 'https:'].includes(source.protocol) &&
      source.host === expectedHost &&
      source.protocol === `${expectedProtocol}:` &&
      source.origin === origin
    );
  } catch {
    return false;
  }
}
