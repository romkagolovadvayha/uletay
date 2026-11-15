export const BUNDLED_GLYPHS_URL = '/map-fonts/noto-v1/{fontstack}/{range}.pbf';

export function bundledGlyphRequest(url: string): { url: string } {
  const prefix = '/map-fonts/noto-v1/';
  const start = url.indexOf(prefix);
  if (start < 0 || /\/(?:0-255|1024-1279|8192-8447)\.pbf$/.test(url)) return { url };
  return { url: `https://tiles.openfreemap.org/fonts/${url.slice(start + prefix.length)}` };
}
