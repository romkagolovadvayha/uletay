export const mapColors = {
  userDot: '#0A84FF',
  userAccuracy: 'rgba(10, 132, 255, 0.18)',
  routeInternal: '#FFC107',
  routeExternal: '#8E8E93',
  sheetBg: '#1C1C1E',
  fabBg: '#1C1C1E',
  fabBorder: 'rgba(255, 255, 255, 0.12)',
  scrim: 'rgba(0, 0, 0, 0.55)',
  pathLine: '#2C2C2E',
  chipActive: '#FFC107',
  chipInactive: '#2C2C2E',
  chipTextActive: '#000000',
  chipTextInactive: '#FFFFFF',
  handle: 'rgba(255, 255, 255, 0.28)',
} as const;

/** Dark OSM basemap with working glyph fonts (incl. Cyrillic). */
export const NATIVE_MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';

/** Fonts available from OpenFreeMap glyph endpoint. */
export const NATIVE_MAP_TEXT_FONT = ['Noto Sans Bold'] as const;
