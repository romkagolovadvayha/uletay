import type { MapZoneProperties } from '@/types';
import { polygonToRectLayout, type RectLayout } from '@/lib/map-geometry';
import { overlayToImageCoordinates, overlayToYandexLayoutBounds } from '@/lib/map-overlay-georef';
import { ZONE_TYPE_LABELS } from '@/lib/map-draw-styles';

export type { RectLayout as ZoneRectLayout };

const LABELED_ZONE_TYPES = new Set<MapZoneProperties['zoneType']>([
  'building',
  'toilet',
  'shower',
  'water',
  'service',
  'comfort',
  'trade',
  'stage_area',
  'custom',
]);

export function zoneLabelText(props: MapZoneProperties): string {
  const trimmed = props.name?.trim();
  if (trimmed) return trimmed;
  return ZONE_TYPE_LABELS[props.zoneType] ?? 'Зона';
}

export function shouldShowZoneLabel(props: MapZoneProperties): boolean {
  if (props.showLabel === false) return false;
  if (props.showLabel === true) return true;
  return LABELED_ZONE_TYPES.has(props.zoneType);
}

export function zoneFillImageRotation(props: MapZoneProperties, layout: RectLayout): number {
  return props.fillImageRotation ?? layout.rotation ?? 0;
}

export function zoneLabelRotation(props: MapZoneProperties, layout: RectLayout): number {
  return props.labelRotation ?? layout.rotation ?? 0;
}

/** Ниже этого zoom подписи скрыты. */
export const ZONE_LABEL_MIN_ZOOM = 15;
/** Минимальная сторона полигона на экране (px), чтобы показать подпись. */
export const ZONE_LABEL_MIN_POLYGON_PX = 34;

export function metersToPixelsAtZoom(meters: number, lat: number, zoom: number): number {
  const metersPerPixel = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
  return meters / metersPerPixel;
}

export function zoneLabelBoxPixels(layout: RectLayout, zoom: number) {
  const widthPx = metersToPixelsAtZoom(layout.widthMeters, layout.center.lat, zoom);
  const heightPx = metersToPixelsAtZoom(layout.heightMeters, layout.center.lat, zoom);
  return { widthPx, heightPx, minSidePx: Math.min(widthPx, heightPx) };
}

export function shouldShowZoneLabelAtZoom(zoom: number, layout: RectLayout): boolean {
  if (zoom < ZONE_LABEL_MIN_ZOOM) return false;
  const { minSidePx } = zoneLabelBoxPixels(layout, zoom);
  return minSidePx >= ZONE_LABEL_MIN_POLYGON_PX;
}

function fitLabelFontSize(text: string, innerW: number, innerH: number): number {
  if (innerW <= 0 || innerH <= 0) return 0;
  const len = Math.max(1, text.length);
  let fontSize = Math.min(innerH * 0.36, innerW * 0.19);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const charW = fontSize * 0.6;
    const lines = Math.max(1, Math.ceil((len * charW) / innerW));
    const lineHeight = fontSize * 1.15;
    const neededH = lines * lineHeight;
    const maxLineW = (len * charW) / lines;
    if (neededH <= innerH && maxLineW <= innerW) {
      return Math.max(6, fontSize);
    }
    fontSize *= 0.85;
  }

  return Math.max(6, fontSize * 0.85);
}

export function applyZoneLabelBoxStyle(
  box: HTMLElement,
  textEl: HTMLElement,
  layout: RectLayout,
  labelRotation: number,
  zoom: number,
): boolean {
  const visible = shouldShowZoneLabelAtZoom(zoom, layout);
  box.style.display = visible ? 'flex' : 'none';
  if (!visible) return false;

  const { widthPx, heightPx } = zoneLabelBoxPixels(layout, zoom);
  box.style.width = `${widthPx}px`;
  box.style.height = `${heightPx}px`;
  box.style.transform = `translate(-50%, -50%) rotate(${labelRotation}deg)`;

  const padding = Math.max(2, Math.min(widthPx, heightPx) * 0.08);
  box.style.padding = `${padding}px`;

  const innerW = Math.max(0, widthPx - padding * 2);
  const innerH = Math.max(0, heightPx - padding * 2);
  const text = textEl.textContent ?? '';
  const fontSize = fitLabelFontSize(text, innerW, innerH);

  if (fontSize < 6) {
    box.style.display = 'none';
    return false;
  }

  textEl.style.fontSize = `${fontSize}px`;
  textEl.style.maxWidth = `${innerW}px`;
  textEl.style.maxHeight = `${innerH}px`;
  return true;
}

export function createZoneLabelElements(text: string): { box: HTMLDivElement; textEl: HTMLSpanElement } {
  const box = document.createElement('div');
  box.className = 'admin-zone-label-box';
  const textEl = document.createElement('span');
  textEl.className = 'admin-zone-label-text';
  textEl.textContent = text;
  box.appendChild(textEl);
  return { box, textEl };
}

export function zoneImageLayout(
  feature: GeoJSON.Feature<GeoJSON.Polygon, MapZoneProperties>,
): RectLayout {
  const layout = feature.properties.layout;
  if (layout) return layout;
  const ring = feature.geometry.coordinates[0] as [number, number][];
  return polygonToRectLayout(ring);
}

export function zoneFillImageBounds(layout: RectLayout): [[number, number], [number, number]] {
  return overlayToYandexLayoutBounds({
    center: layout.center,
    widthMeters: layout.widthMeters,
    aspectRatio: layout.heightMeters / layout.widthMeters,
  });
}

export function zoneFillImageCoordinates(
  layout: RectLayout,
  rotation?: number,
): [[number, number], [number, number], [number, number], [number, number]] {
  return overlayToImageCoordinates({
    center: layout.center,
    widthMeters: layout.widthMeters,
    aspectRatio: layout.heightMeters / layout.widthMeters,
    rotation: rotation ?? layout.rotation,
  });
}
