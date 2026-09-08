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

/** Self-contained so the native WebView runs the same grouping logic. No place is dropped. */
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

/** Shared DOM renderer, also embedded verbatim in the native map WebView. */
export function createMapPlaceElement(group: MapPlaceGroup, zoom: number): HTMLButtonElement {
  const place = group.places[0], clustered = group.places.length > 1;
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'fest-place-marker' + (place.selected ? ' fest-place-marker--selected' : '');
  el.style.setProperty('--place-color', place.color);
  el.setAttribute('aria-label', clustered ? `Места рядом: ${group.places.length}. ${group.places.map(p => p.name).join(', ')}` : place.name);
  el.dataset.mapPlaces = group.places.map(p => `${p.kind}:${p.id}`).join('|');
  el.title = clustered ? `Места рядом · ${group.places.length}` : place.name;
  if (place.layout && !clustered) {
    const layout = place.layout;
    const metersPerPixel = 156543.03392 * Math.cos(layout.center.lat * Math.PI / 180) / 2 ** zoom;
    const width = layout.widthMeters / metersPerPixel, height = layout.heightMeters / metersPerPixel;
    const lines = (place.label || place.name).split('\n');
    const textWidth = (line: string) => place.isPitch ? [...line].reduce((sum, char) => sum + (char === '.' ? 0.28 : 0.59), 0) : line.length * 0.64;
    const font = Math.min(place.isArea ? 16 : 12, (width - 2) / Math.max(...lines.map(textWidth)), (height - 2) / (lines.length * 1.2));
    if (font >= (place.isPitch ? 6 : 8) || place.isArea || place.isPitch) {
      el.classList.add('fest-place-marker--footprint');
      if (place.isPitch) el.classList.add('fest-place-marker--pitch');
      el.dataset.polygonLabel = place.id;
      Object.assign(el.style, { width: width + 'px', height: height + 'px', fontSize: Math.max(1, font) + 'px',
        transform: `translate(-50%,-50%) rotate(${layout.rotation}deg)` });
      if (font < (place.isPitch ? 6 : 8)) { el.style.display = 'none'; el.tabIndex = -1; }
      el.textContent = lines.join('\n');
      return el;
    }
  }
  const paths: Record<string, string> = {
    car: 'M4 15V9l2-5h12l2 5v6M4 9h16M7 12h1m8 0h1M5 15v3m14-3v3M3 15h18',
    gate: 'M14 4h6v16h-6M3 12h12m-4-4 4 4-4 4',
    exit: 'M10 4H4v16h6m0-8h11m-4-4 4 4-4 4',
    info: 'M12 11v6m0-10v.1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    stage: 'M8 18V6l11-2v12M8 8l11-2M8 18a3 2 0 1 1-3-2m14 0a3 2 0 1 1-3-2',
    medical: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
    water: 'M12 3s-7 8-7 12a7 7 0 0 0 14 0c0-4-7-12-7-12z',
    foodcourt: 'M5 3v7m3-7v7M3 3v5a3 3 0 0 0 6 0M6 11v10M17 3v18m0-18c-4 2-4 9 0 9',
    security: 'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6zM8 12l3 3 5-6',
    custom: 'M4 20V8l8-5 8 5v12zM9 20v-7h6v7',
    signature: 'm4 16 10-10 4 4-10 10H4zM14 6l2-2 4 4-2 2M4 22h16',
    ticket: 'M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4zM15 5v3m0 3v2m0 3v3',
    heart: 'M12 20 4 12C-2 5 7 0 12 7c5-7 14-2 8 5z',
    office: 'M5 21V3h14v18M3 21h18M9 7h1m4 0h1M9 11h1m4 0h1M10 21v-6h4v6',
    bag: 'M5 8h14l1 13H4zM8 9V6a4 4 0 0 1 8 0v3',
  };
  if (clustered) {
    el.classList.add('fest-place-marker--cluster');
    el.textContent = String(group.places.length);
  } else if (paths[place.icon || '']) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', paths[place.icon!]); svg.appendChild(path); el.appendChild(svg);
  } else el.textContent = place.glyph;
  if (place.badge) {
    const badge = document.createElement('span'); badge.className = 'fest-place-badge'; badge.textContent = place.badge; el.appendChild(badge);
  }
  // Polygon captions never escape their footprints; point-only entries have a hover title.
  if (place.kind === 'poi' || clustered) {
    const label = document.createElement('span'); label.className = 'fest-place-name';
    label.textContent = clustered ? `Места рядом · ${group.places.length}` : place.name; el.appendChild(label);
  }
  return el;
}

export const mapPlaceMarkerCss = `
  .fest-place-marker { position:relative; display:flex; align-items:center; justify-content:center;
    width:26px; height:26px; padding:0; margin:0; border:1px solid var(--place-color,#FFD400);
    border-radius:7px; background:#20242AEF; color:var(--place-color,#FFD400);
    font:800 11px/1 system-ui,sans-serif; box-shadow:0 2px 8px #0008; cursor:pointer;
    transform:translate(-50%,-50%); }
  .fest-place-marker svg { width:17px; height:17px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
  .fest-place-badge { position:absolute; right:-5px; top:-6px; min-width:12px; height:12px; border-radius:4px; background:#FFD400; color:#181A1F; font:800 9px/12px system-ui; border:1px solid #20242A; }
  .fest-place-marker--cluster { width:24px; height:24px; border-radius:7px; border-style:double; font-size:11px; color:#ddd; border-color:#777; }
  .fest-place-marker--footprint { border:0; border-radius:0; background:transparent!important; box-shadow:none; padding:0; overflow:hidden; white-space:pre; color:#F2F0DD; text-align:center; line-height:1.2; text-shadow:0 1px 2px #000; }
  .fest-place-marker--pitch { color:#FFF0AE; font-weight:700; }
  .fest-place-marker--selected { background:#FFD400; color:#171717; border-color:#fff; z-index:2; }
  .fest-place-marker--offset { transform:translate(calc(-50% - 44px),-50%); }
  .fest-place-marker--offset::before { content:''; position:absolute; left:100%; top:50%; width:44px; border-top:1px dotted #FFD400; pointer-events:none; }
  .fest-place-marker:focus-visible { outline:3px solid #fff; outline-offset:3px; }
  .fest-place-name { display:none; position:absolute; top:calc(100% + 4px); left:50%; transform:translateX(-50%);
    max-width:156px; width:max-content; padding:4px 6px; border-radius:4px; background:#181A1FEF;
    color:#fff; font:600 11px/1.2 system-ui,sans-serif; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; pointer-events:none; }
  .fest-place-marker--named .fest-place-name, .fest-place-marker:hover .fest-place-name,
  .fest-place-marker:focus-visible .fest-place-name { display:block; }
  .fest-place-marker--name-above .fest-place-name { top:auto; bottom:calc(100% + 4px); }
`;
