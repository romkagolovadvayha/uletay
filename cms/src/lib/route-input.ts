const coordinate = (value: string | null, max: number): number | null => {
  if (value === null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && Math.abs(parsed) <= max ? parsed : null;
};

export function parseRouteInput(params: URLSearchParams): { waypoints: string; avoidZones: string[]; mode: 'walking' | 'driving' } | null {
  const mode = params.get('mode') ?? 'walking';
  if (mode !== 'walking' && mode !== 'driving') return null;
  const raw = params.get('waypoints');
  let points: string[];
  if (raw) {
    if (raw.length > 2048) return null;
    points = raw.split('|');
  } else {
    const coords = ['fromLat', 'fromLng', 'toLat', 'toLng'].map((key, index) => coordinate(params.get(key), index % 2 === 0 ? 90 : 180));
    if (coords.some((v) => v === null)) return null;
    points = [`${coords[0]},${coords[1]}`, `${coords[2]},${coords[3]}`];
  }
  if (points.length < 2 || points.length > 25) return null;
  const normalized: string[] = [];
  for (const point of points) {
    const pair = point.split(',');
    if (pair.length !== 2) return null;
    const lat = coordinate(pair[0], 90);
    const lng = coordinate(pair[1], 180);
    if (lat === null || lng === null) return null;
    normalized.push(`${lat},${lng}`);
  }
  const avoidZones = params.getAll('avoidZones');
  if (avoidZones.length > 20 || avoidZones.some((zone) => zone.length > 4096)) return null;
  return { mode, waypoints: normalized.join('|'), avoidZones };
}
