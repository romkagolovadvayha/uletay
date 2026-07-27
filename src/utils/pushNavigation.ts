const SAFE_PUSH_PATHS = [
  /^\/$/,
  /^\/map(?:\/[^/?#]+)?$/,
  /^\/schedule(?:\/(?:live|full)(?:\/[^/?#]+)?)?$/,
  /^\/autographs(?:\/[^/?#]+)?$/,
  /^\/favorites$/,
  /^\/playlist$/,
  /^\/headliners(?:\/[^/?#]+)?$/,
  /^\/foodcourt(?:\/[^/?#]+)?$/,
  /^\/(?:about|rules|settings|legal)$/,
];

export function getSafePushPath(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const raw = value.trim();
  if (!raw || raw.length > 255 || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) {
    return null;
  }
  try {
    const parsed = new URL(raw, 'https://uletay.local');
    const decodedPath = decodeURIComponent(parsed.pathname);
    return SAFE_PUSH_PATHS.some((pattern) => pattern.test(decodedPath)) ? raw : null;
  } catch {
    return null;
  }
}
