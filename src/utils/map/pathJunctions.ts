import type { MapPathProperties } from '../../types/map';

type Path = GeoJSON.Feature<GeoJSON.LineString, MapPathProperties>;
type XY = [number, number];
const cross = (a: XY, b: XY) => a[0] * b[1] - a[1] * b[0];
const subtract = (a: XY, b: XY): XY => [a[0] - b[0], a[1] - b[1]];

/** Split actual drawn roads at crossroads and T junctions, without adding roads. */
export function splitPathJunctions(features: Path[], toleranceMeters: number): Path[] {
  const segments = features.flatMap((feature, featureIndex) =>
    feature.geometry.coordinates.slice(1).map((p, i) => ({
      featureIndex, index: i, a: feature.geometry.coordinates[i] as XY, b: p as XY,
      splits: new Set([0, 1]),
    })),
  );
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const r = subtract(s.b, s.a);
    const sx = 111320 * Math.cos(s.a[1] * Math.PI / 180);
    const lengthSquared = (r[0] * sx) ** 2 + (r[1] * 111320) ** 2;
    if (!lengthSquared) continue;
    for (let j = 0; j < segments.length; j++) {
      if (i === j) continue;
      const q = segments[j];
      for (const p of [q.a, q.b]) {
        const delta = subtract(p, s.a);
        const t = (delta[0] * r[0] * sx ** 2 + delta[1] * r[1] * 111320 ** 2) / lengthSquared;
        if (t <= 0 || t >= 1) continue;
        const distance = Math.hypot((s.a[0] + t*r[0] - p[0])*sx, (s.a[1] + t*r[1] - p[1])*111320);
        if (distance <= toleranceMeters) s.splits.add(t);
      }
      if (j <= i) continue;
      const direction = subtract(q.b, q.a);
      const denominator = cross(r, direction);
      if (Math.abs(denominator) < 1e-18) continue;
      const delta = subtract(q.a, s.a);
      const t = cross(delta, direction) / denominator;
      const u = cross(delta, r) / denominator;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        s.splits.add(t);
        q.splits.add(u);
      }
    }
  }
  return features.map((feature, index) => {
    const coordinates: number[][] = [];
    for (const s of segments.filter(segment => segment.featureIndex === index)) {
      for (const t of [...s.splits].sort((a,b) => a-b)) {
        const p = [s.a[0] + t*(s.b[0]-s.a[0]), s.a[1] + t*(s.b[1]-s.a[1])];
        const last = coordinates.at(-1);
        if (!last || last[0] !== p[0] || last[1] !== p[1]) coordinates.push(p);
      }
    }
    return {...feature, geometry:{...feature.geometry, coordinates}};
  });
}
