import alphabet from '../../data/mapFontOutlines.json';
import type { MapPlaceMarker } from './placeMarkers';
import type { ZoneRectLayout } from './zoneFillImage';

type XY = [number, number];
type Glyph = { advance: number; polygons: number[][][][] };
const font = alphabet as Record<string, Glyph>;
const outlines = new Map<string, { polygons: number[][][][]; bounds: number[] }>();

function textOutline(text: string) {
  const cached = outlines.get(text);
  if (cached) return cached;
  const polygons: number[][][][] = [];
  const lines = text.toUpperCase().split('\n');
  const widths = lines.map(line => [...line].reduce((sum, c) => sum + (font[c]?.advance ?? font[' '].advance), 0));
  lines.forEach((line, row) => {
    let cursor = -widths[row] / 2;
    for (const char of line) {
      const glyph = font[char] ?? font[' '];
      polygons.push(...glyph.polygons.map(poly => poly.map(ring => ring.map(p => [p[0] + cursor, p[1] + row * 1.18]))));
      cursor += glyph.advance;
    }
  });
  const points = polygons.flat(2);
  const bounds = [Math.min(...points.map(p => p[0])), Math.min(...points.map(p => p[1])), Math.max(...points.map(p => p[0])), Math.max(...points.map(p => p[1]))];
  const result = { polygons, bounds };
  outlines.set(text, result);
  return result;
}

/** Real glyph contours fit the interior rectangle. No estimated character widths. */
export function letteringGeometry(text: string, layout: ZoneRectLayout, maxEm = Infinity): GeoJSON.MultiPolygon | null {
  const shape = textOutline(text);
  if (!shape.polygons.length) return null;
  const [x0, y0, x1, y1] = shape.bounds;
  const scale = Math.min(maxEm, layout.widthMeters * .88 / (x1 - x0), layout.heightMeters * .78 / (y1 - y0));
  if (!(scale > 0)) return null;
  const angle = layout.rotation * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
  const sx = 111320 * Math.cos(layout.center.lat * Math.PI / 180);
  const transform = (p: number[]): XY => {
    const x = (p[0] - (x0 + x1) / 2) * scale, y = (p[1] - (y0 + y1) / 2) * scale;
    return [layout.center.lng + (x * cos - y * sin) / sx, layout.center.lat - (x * sin + y * cos) / 111320];
  };
  return { type: 'MultiPolygon', coordinates: shape.polygons.map(poly => poly.map(ring => ring.map(transform))) };
}

export function buildMapLettering(markers: MapPlaceMarker[]) {
  return markers.filter(p => !p.isPitch).flatMap(place => {
    const layout = place.layout ?? { center: { lng: place.coordinates[0], lat: place.coordinates[1] }, widthMeters: 26, heightMeters: 6, rotation: 0 };
    const geometry = letteringGeometry(place.label ?? place.name.toUpperCase(), layout, place.isArea ? (place.icon === 'parking' ? 30 : 14) : 4);
    if (!geometry) return [];
    return [{ type: 'Feature' as const, geometry, properties: {
      groupKey: `${place.kind}:${place.id}`, zoneId: place.kind === 'zone' ? place.id : '',
      color: place.labelColor ?? '#BA2F2A', base: place.height ?? 0, height: (place.height ?? 0) + .025,
    } }];
  });
}
