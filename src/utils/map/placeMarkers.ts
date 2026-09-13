import type { MapPoiProperties, MapZoneProperties } from '../../types/map';
import { zonePoiCategory } from './poiData';
import type { ZoneRectLayout } from './zoneFillImage';
import { polygonLabelLayout } from './polygonLabelLayout';

export type MapPlaceMarker = {
  id: string;
  kind: 'zone' | 'poi';
  name: string;
  coordinates: [number, number];
  glyph: string;
  color: string;
  selected: boolean;
  pinned: boolean;
  priority: number;
  layout?: ZoneRectLayout;
  label?: string;
  isArea?: boolean;
  isPitch?: boolean;
  icon?: string;
  badge?: string;
};
export type MapPlaceGroup = { coordinates: [number, number]; places: MapPlaceMarker[]; offset?: number };

const symbols: Record<string, [string, string]> = {
  stage: ['♪', '#FFD400'], foodcourt: ['ЕДА', '#E8BD86'],
  toilet: ['WC', '#74D5FF'], shower: ['ДУШ', '#74D5FF'], water: ['H₂O', '#74D5FF'],
  medical: ['+', '#FF818A'], security: ['ЩИТ', '#C9B5FF'], info: ['i', '#FFFFFF'],
  entrance: ['КПП', '#FFD400'], parking: ['P', '#77BFFF'], custom: ['•', '#DDE2E8'],
};
const layouts = new WeakMap<object, ZoneRectLayout>();

/** Display points stay inside the drawn place; routing uses its separate accessPoint. */
export function buildMapPlaceMarkers(
  zones: GeoJSON.Feature<GeoJSON.Polygon, MapZoneProperties>[],
  pois: GeoJSON.Feature<GeoJSON.Point, MapPoiProperties>[],
  selectedZoneId?: string | null,
  selectedPoiId?: string | null,
): MapPlaceMarker[] {
  const result: MapPlaceMarker[] = zones.filter(f => f.properties.zoneType !== 'fence').map(zone => {
    const p = zone.properties;
    const category = zonePoiCategory(zone) ?? 'custom';
    let [glyph, color] = symbols[category];
    if (p.zoneType === 'camping') { glyph = '△'; color = '#90CA75'; }
    if (p.zoneType === 'autocamp') glyph = p.name.includes('Автодома') ? 'ДОМ' : 'АВТО';
    if (p.parentZoneId) glyph = p.name.match(/A\d+$/)?.[0] ?? glyph;
    if (p.markerLabel) { glyph = p.markerLabel; color = '#F5D547'; }
    if (p.zoneType === 'comfort') { glyph = 'К'; color = '#FFB66E'; }
    if (p.zoneType === 'building' && /мерч/i.test(p.name)) glyph = 'М';
    if (/танцпол/i.test(p.name)) glyph = 'Т';
    if (/детск/i.test(p.name) && category === 'custom') glyph = 'Д';
    let layout = layouts.get(zone);
    if (!layout) { layout = polygonLabelLayout(zone); layouts.set(zone, layout); }
    const center = layout.center;
    const isPitch = Boolean(p.parentZoneId);
    const isArea = !isPitch && ['parking', 'camping', 'autocamp', 'comfort'].includes(p.zoneType);
    const label = isPitch ? glyph : p.zoneType === 'parking' ? 'ПАРКОВКА' : p.zoneType === 'camping' ? 'ПАЛАТОЧНЫЙ\nГОРОДОК' :
      /танцпол/i.test(p.name) ? 'ТАНЦПОЛ' : p.zoneType === 'toilet' ? 'WC' : p.zoneType === 'shower' ? 'ДУШ' :
      p.zoneType === 'water' ? 'ВОДА' : /мерч/i.test(p.name) ? 'МЕРЧ' : category === 'medical' ? 'МЕДПУНКТ' :
      /торговые/i.test(p.name) ? 'ТОРГОВЫЕ РЯДЫ' : p.name.replace(/ — .*$/, '').replace('Палаточная гостиница', 'ПАЛАТОЧНАЯ\nГОСТИНИЦА').replace('Палаточный городок', 'ПАЛАТОЧНЫЙ\nГОРОДОК').replace('Лагерь «Комфорт»', 'ЛАГЕРЬ\nКОМФОРТ').replace('Западная сцена', 'ЗАПАДНАЯ\nСЦЕНА').replace('Южная сцена', 'ЮЖНАЯ\nСЦЕНА').replace('Сцена РЕН ТВ', 'СЦЕНА\nРЕН ТВ').toUpperCase();
    return {
      id: p.id, kind: 'zone', name: p.name, coordinates: [center.lng, center.lat],
      glyph, color, selected: p.id === selectedZoneId,
      pinned: category === 'parking' && !p.parentZoneId,
      priority: category === 'stage' ? 8 : category === 'medical' ? 7 : 1,
      layout, label, isArea, isPitch,
      icon: /автограф/i.test(p.name) ? 'signature' : /касса/i.test(p.name) ? 'ticket' : /загс/i.test(p.name) ? 'heart' :
        /административ/i.test(p.name) ? 'office' : /мерч/i.test(p.name) ? 'bag' : category,
    };
  });
  for (const poi of pois) {
    const p = poi.properties;
    if (p.sourceZoneId || (p.category === 'stage' && zones.some(z => z.properties.zoneType === 'stage_area' &&
      (z.properties.name === p.name || (p.link?.id && ({ 'ren-tv': /рен/i, west: /запад/i, south: /юж/i }[p.link.id]?.test(z.properties.name))))))) continue;
    let [glyph, color] = symbols[p.category] ?? symbols.custom;
    if (p.category === 'entrance') glyph = p.name.match(/№\s*\d+/)?.[0] ?? (p.name.includes('Авто') ? 'АВТО' : 'КПП');
    result.push({ id: p.id, kind: 'poi', name: p.name, coordinates: poi.geometry.coordinates as [number, number],
      glyph, color, selected: p.id === selectedPoiId, pinned: false, priority: 5,
      icon: /въезд|автовъезд/i.test(p.name) ? 'car' : /выход|выезд|турникет/i.test(p.name) ? 'exit' : p.category === 'entrance' ? 'gate' : 'info',
      badge: p.name.match(/№\s*(\d+)/)?.[1] });
  }
  return result;
}

/** Shared clustering for both renderers. No place is dropped. */
export function clusterMapPlaces(places: MapPlaceMarker[], zoom: number): MapPlaceGroup[] {
  const scale = 256 * 2 ** Math.max(0, Math.min(22, zoom));
  const project = (c: [number, number]) => {
    const s = Math.sin(Math.max(-85, Math.min(85, c[1])) * Math.PI / 180);
    return [(c[0] + 180) / 360 * scale, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale];
  };
  const groups: MapPlaceGroup[] = [];
  const sorted = [...places].sort((a, b) => Number(b.selected) - Number(a.selected) || Number(b.pinned) - Number(a.pinned) || b.priority - a.priority || a.id.localeCompare(b.id, 'ru', { numeric: true }));
  for (const place of sorted) {
    const xy = project(place.coordinates);
    const group = !place.isArea && !place.isPitch && place.priority < 8 && !place.selected ? groups.find(g => {
      if (g.places[0].isArea || g.places[0].isPitch || g.places[0].priority >= 8 || g.places[0].selected) return false;
      const center = project(g.coordinates);
      return Math.hypot(center[0] - xy[0], center[1] - xy[1]) < (zoom >= 18 ? 16 : 26);
    }) : undefined;
    if (group) {
      group.places.push(place);
      group.coordinates = [
        group.places.reduce((s, p) => s + p.coordinates[0], 0) / group.places.length,
        group.places.reduce((s, p) => s + p.coordinates[1], 0) / group.places.length,
      ];
    } else groups.push({ coordinates: [...place.coordinates], places: [place] });
  }
  return groups;
}
