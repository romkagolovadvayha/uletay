import type { MapZoneProperties } from '../../types/map';
import type { ZoneRectLayout } from './zoneFillImage';

type Point = [number, number];

/** A label rectangle must fit the actual footprint, including its holes. */
export function polygonLabelLayout(zone: GeoJSON.Feature<GeoJSON.Polygon, MapZoneProperties>): ZoneRectLayout {
  const rings = zone.geometry.coordinates as Point[][];
  const ring = rings[0].slice(0, -1);
  const origin = ring.reduce((s, p) => [s[0] + p[0] / ring.length, s[1] + p[1] / ring.length] as Point, [0, 0] as Point);
  const sx = 111320 * Math.cos(origin[1] * Math.PI / 180);
  const local = rings.map(r => r.map(p => [(p[0] - origin[0]) * sx, -(p[1] - origin[1]) * 111320] as Point));
  const inside = (p: Point) => {
    const inRing = (r: Point[]) => {
      let yes = false;
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const a = r[i], b = r[j];
        if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) yes = !yes;
      }
      return yes;
    };
    return inRing(local[0]) && !local.slice(1).some(inRing);
  };
  const edges = local[0].slice(1).map((b, i) => {
    const a = local[0][i];
    let angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    while (angle > Math.PI / 2) angle -= Math.PI;
    while (angle < -Math.PI / 2) angle += Math.PI;
    return { angle, length: Math.hypot(b[0] - a[0], b[1] - a[1]) };
  }).sort((a, b) => b.length - a.length);
  let pitchAngle = Math.atan2(local[0][1][1] - local[0][0][1], local[0][1][0] - local[0][0][0]);
  while (pitchAngle > Math.PI / 2) pitchAngle -= Math.PI;
  while (pitchAngle < -Math.PI / 2) pitchAngle += Math.PI;
  const angles = zone.properties.parentZoneId ? [pitchAngle] :
    [...new Set([edges[0]?.angle ?? 0, 0, ...edges.slice(1, 3).map(e => e.angle)].map(a => Math.round(a * 1000) / 1000))];
  let best = { center: [0, 0] as Point, width: 0, height: 0, angle: 0, score: 0 };
  const cross = (a: Point, b: Point, c: Point) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const intersects = (a: Point, b: Point, c: Point, d: Point) => cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0;
  for (const angle of angles) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const rotated = local[0].map(([x, y]) => [x * cos + y * sin, -x * sin + y * cos]);
    const xmin = Math.min(...rotated.map(p => p[0])), xmax = Math.max(...rotated.map(p => p[0]));
    const ymin = Math.min(...rotated.map(p => p[1])), ymax = Math.max(...rotated.map(p => p[1]));
    const toLocal = (x: number, y: number): Point => [x * cos - y * sin, x * sin + y * cos];
    // Rectangles use their centre; irregular areas also consider an interior grid.
    const grid = ring.length === 4 && rings.length === 1 ? [0.5] : [0.18, 0.34, 0.5, 0.66, 0.82];
    for (const u of grid) for (const v of grid) {
      const x = xmin + (xmax - xmin) * u, y = ymin + (ymax - ymin) * v;
      const center = toLocal(x, y);
      if (!inside(center)) continue;
      const ratios = [Math.max(0.3, Math.min(16, (xmax - xmin) / Math.max(0.1, ymax - ymin))), 2.5, 5, 10];
      for (const ratio of ratios) {
        let low = 0, high = Math.min(ymax - ymin, (xmax - xmin) / ratio);
        for (let step = 0; step < 11; step++) {
          const h = (low + high) / 2, w = h * ratio;
          const corners = [[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2, y + h / 2], [x - w / 2, y + h / 2]].map(p => toLocal(p[0], p[1]));
          const valid = corners.every(inside) && !local.some(r => r.slice(1).some((b, i) => corners.some((c, j) => intersects(c, corners[(j + 1) % 4], r[i], b)))) &&
            !local.slice(1).some(r => r.some(p => {const rx = p[0] * cos + p[1] * sin, ry = -p[0] * sin + p[1] * cos; return Math.abs(rx - x) < w / 2 && Math.abs(ry - y) < h / 2;}));
          if (valid) low = h; else high = h;
        }
        const height = low * 0.9, width = height * ratio;
        const score = width * height;
        if (score > best.score) best = { center, width, height, angle, score };
      }
    }
  }
  return { center: { lng: origin[0] + best.center[0] / sx, lat: origin[1] - best.center[1] / 111320 },
    widthMeters: best.width, heightMeters: best.height, rotation: best.angle * 180 / Math.PI };
}
