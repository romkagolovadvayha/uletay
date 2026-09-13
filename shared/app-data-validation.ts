import type { AppData } from '../src/types';

type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string';
const id = (value: unknown): value is string => text(value) && value.trim().length > 0 && value.length <= 255;
const number = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const optional = (value: unknown, check: (value: unknown) => boolean) => value === undefined || check(value);
const list = (value: unknown, check: (value: unknown) => boolean): value is unknown[] => Array.isArray(value) && value.every(check);
const texts = (value: unknown) => list(value, text);
const fields = (value: RecordValue, names: string[]) => names.every((name) => text(value[name]));
const optionalFields = (value: RecordValue, names: string[]) => names.every((name) => optional(value[name], text));
const time = (value: unknown) => text(value) && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const date = (value: unknown) => {
  if (!text(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const latLng = (value: unknown) => record(value) && number(value.lat) && Math.abs(value.lat) <= 90 && number(value.lng) && Math.abs(value.lng) <= 180;
const position = (value: unknown): value is number[] => Array.isArray(value) && value.length >= 2 && value.every(number) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
const ring = (value: unknown) => list(value, position) && value.length >= 4 &&
  JSON.stringify(value[0]) === JSON.stringify(value[value.length - 1]);
const polygon = (value: unknown) => record(value) && value.type === 'Polygon' && list(value.coordinates, ring) && value.coordinates.length > 0;
const unique = (items: unknown[]) => new Set(items.map((item) => (item as RecordValue).id)).size === items.length;
const nonnegative = (value: unknown) => number(value) && value >= 0;
const named = (value: unknown) => record(value) && text(value.name);
const lastfm = (value: unknown) => record(value) && fields(value, ['name', 'updatedAt']) &&
  optionalFields(value, ['bioSummary', 'bioPublished', 'searchQuery']) &&
  ['listeners', 'playcount', 'topTracksTotal'].every((key) => optional(value[key], nonnegative)) &&
  optional(value.onTour, (v) => typeof v === 'boolean') && list(value.tags, named) && list(value.similarArtists, named) &&
  list(value.topTracks, (track) => record(track) && text(track.name) && nonnegative(track.rank) &&
    optional(track.artistName, text) && ['listeners', 'playcount', 'durationSec'].every((key) => optional(track[key], nonnegative)));

export function validateMapCollection(value: unknown, geometry: 'Polygon' | 'LineString' | 'Point'): boolean {
  if (!record(value) || value.type !== 'FeatureCollection' || !Array.isArray(value.features)) return false;
  const featureIds = new Set<string>();
  return value.features.every((feature: unknown) => {
    if (!record(feature) || feature.type !== 'Feature' || !record(feature.geometry) || !record(feature.properties)) return false;
    const g = feature.geometry;
    const p = feature.properties;
    if (g.type !== geometry || !id(p.id) || featureIds.has(p.id)) return false;
    featureIds.add(p.id);
    if (!optional(p.accessPoint, latLng)) return false;
    if (!optional(p.accessRestricted, (v) => typeof v === 'boolean')) return false;
    if (geometry === 'Point') return position(g.coordinates) && id(p.name) &&
      ['stage', 'foodcourt', 'toilet', 'shower', 'water', 'medical', 'security', 'info', 'entrance', 'parking', 'custom'].includes(String(p.category)) &&
      optional(p.link, (link) => record(link) && ['stage', 'foodcourt', 'none'].includes(String(link.type)) && optional(link.id, id));
    if (geometry === 'LineString') return list(g.coordinates, position) && g.coordinates.length >= 2 &&
      optional(p.openAreaId, id) &&
      optional(p.pathKind, (kind) => ['road', 'walkway', 'fence'].includes(String(kind))) &&
      optional(p.closed, (v) => typeof v === 'boolean') && optional(p.routingOnly, (v) => typeof v === 'boolean');
    return polygon(g) && id(p.name) && text(p.fillColor) && number(p.fillOpacity) && p.fillOpacity >= 0 && p.fillOpacity <= 1 &&
      ['building', 'camping', 'parking', 'autocamp', 'comfort', 'trade', 'stage_area', 'service', 'toilet', 'shower', 'water', 'fence', 'custom'].includes(String(p.zoneType)) &&
      optional(p.geometryParts, (parts) => list(parts, polygon)) && optional(p.schematicGeometry, polygon) &&
      optional(p.layoutRings, (rings) => list(rings, ring)) &&
      optional(p.layout, (layout) => record(layout) && latLng(layout.center) && number(layout.widthMeters) && layout.widthMeters > 0 && number(layout.heightMeters) && layout.heightMeters > 0 && number(layout.rotation));
  });
}

/** Check untrusted JSON before either client normalization or a CMS write. */
export function validateAppData(value: unknown): value is AppData {
  if (!record(value) || !record(value.festival)) return false;
  const f = value.festival;
  if (!fields(f, ['name', 'location', 'locationShort', 'ageRating']) || !id(f.name) ||
    !number(f.year) || !Number.isInteger(f.year) || f.year < 2000 || f.year > 2100 ||
    !date(f.startDate) || !date(f.endDate) || String(f.startDate) > String(f.endDate) ||
    !optionalFields(f, ['heroImageUrl', 'logoImageUrl'])) return false;
  if (!optional(value.revision, (revision) => text(revision) && /^[a-f0-9]{64}$/.test(revision)) || !optional(value.mapDataVersion, text)) return false;
  if (!list(value.stages, (s) => record(s) && id(s.id) && fields(s, ['name', 'shortName']) && optional(s.color, text)) || !unique(value.stages)) return false;
  if (!list(value.headliners, (h) => record(h) && id(h.id) && fields(h, ['name', 'description', 'imageTint']) &&
    list(h.years, (year) => number(year) && Number.isInteger(year) && year >= 2000 && year <= 2100) &&
    optional(h.imageUrl, text) && optional(h.alternateNames, texts) && optional(h.linkedHeadlinerIds, (v) => list(v, id)) &&
    optional(h.lastfm, lastfm)
  ) || !unique(value.headliners)) return false;
  const stageIds = new Set(value.stages.map((s) => (s as RecordValue).id));
  const artistIds = new Set(value.headliners.map((h) => (h as RecordValue).id));
  if (!value.headliners.every((h) => ((h as RecordValue).linkedHeadlinerIds as string[] | undefined)?.every((key) => artistIds.has(key)) ?? true)) return false;
  for (const name of ['schedule', 'autographs']) {
    const items = value[name];
    if (!list(items, (item) => record(item) && id(item.id) && stageIds.has(item.stageId) && artistIds.has(item.headlinerId) &&
      text(item.artist) && date(item.date) && time(item.startTime) && time(item.endTime) && optionalFields(item, ['imageUrl', 'location']) &&
      optional(item.isCompetition, (v) => typeof v === 'boolean')) || !unique(items)) return false;
  }
  if (!list(value.foodcourt, (v) => record(v) && id(v.id) && fields(v, ['name', 'description', 'location', 'hours', 'priceFrom', 'distance', 'imageTint']) &&
    ['hot', 'drinks', 'desserts'].includes(String(v.category)) && optionalFields(v, ['imageUrl', 'priceRange', 'legalName', 'contacts', 'notes']) &&
    optional(v.menuImageUrls, texts) && optional(v.menu, (menu) => list(menu, (section) => record(section) && text(section.title) && list(section.items, (item) => record(item) && fields(item, ['name', 'price']) && optionalFields(item, ['portion', 'description']))))) || !unique(value.foodcourt)) return false;
  if (!list(value.rules, (tab) => record(tab) && id(tab.id) && text(tab.label) && list(tab.blocks, (block) => record(block) &&
    optional(block.title, text) && optional(block.paragraphs, texts) && optional(block.items, texts) && optional(block.important, (v) => typeof v === 'boolean') &&
    optional(block.link, (link) => record(link) && fields(link, ['label', 'url'])))) || !unique(value.rules)) return false;
  if (!optional(value.festivalMap, (map) => record(map) && latLng(map.center) && number(map.defaultZoom) && map.defaultZoom >= 0 && map.defaultZoom <= 24 && typeof map.enabled === 'boolean' &&
    optional(map.territoryBounds, (b) => record(b) && latLng(b.sw) && latLng(b.ne)) &&
    optional(map.siteOutline, (g) => record(g) && g.type === 'MultiPolygon' && list(g.coordinates, (p) => list(p, ring) && p.length > 0) && g.coordinates.length > 0) &&
    optional(map.adminOverlay, (o) => record(o) && text(o.imageUrl) && latLng(o.center) && number(o.widthMeters) && o.widthMeters > 0 && optional(o.aspectRatio, (v) => number(v) && v > 0) && optional(o.opacity, (v) => number(v) && v >= 0 && v <= 1) && optional(o.rotation, number)))) return false;
  if (!optional(value.mapZones, (v) => validateMapCollection(v, 'Polygon')) || !optional(value.mapPaths, (v) => validateMapCollection(v, 'LineString')) || !optional(value.mapPois, (v) => validateMapCollection(v, 'Point'))) return false;
  if (record(value.mapPois) && Array.isArray(value.mapPois.features)) {
    const vendors = new Set(value.foodcourt.map((v) => (v as RecordValue).id));
    for (const feature of value.mapPois.features) {
      const link = feature.properties.link;
      if (link?.type === 'stage' && !stageIds.has(link.id)) return false;
      if (link?.type === 'foodcourt' && !vendors.has(link.id)) return false;
    }
  }
  return true;
}
