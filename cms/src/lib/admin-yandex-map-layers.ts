import type { MapPathsGeoJson, MapPoisGeoJson, MapZoneProperties, MapZonesGeoJson } from '@/types';
import type { YandexMapsBundle } from './yandex-maps-loader';
import { pathFeatureStyle, zoneFeatureStyle } from './map-draw-styles';

export function removeMapChildren(map: YandexMapInstance, items: YandexMapEntity[]) {
  for (const item of items) {
    map.removeChild(item);
  }
  items.length = 0;
}

function zoneStyle(feature: GeoJSON.Feature) {
  const props = feature.properties as MapZoneProperties;
  return zoneFeatureStyle(props);
}

export function syncZoneFeatures(
  map: YandexMapInstance,
  bundle: YandexMapsBundle,
  zones: MapZonesGeoJson,
  bucket: YandexMapEntity[],
) {
  removeMapChildren(map, bucket);
  zones.features.forEach((feature, index) => {
    if (feature.geometry.type !== 'Polygon') return;
    const item = new bundle.ymaps3.YMapFeature({
      id: `zone-${index}`,
      geometry: feature.geometry,
      style: zoneStyle(feature),
      properties: feature.properties ?? {},
    });
    map.addChild(item);
    bucket.push(item);
  });
}

export function syncPathFeatures(
  map: YandexMapInstance,
  bundle: YandexMapsBundle,
  paths: MapPathsGeoJson,
  bucket: YandexMapEntity[],
) {
  removeMapChildren(map, bucket);
  paths.features.forEach((feature, index) => {
    if (feature.geometry.type !== 'LineString') return;
    const item = new bundle.ymaps3.YMapFeature({
      id: `path-${index}`,
      geometry: feature.geometry,
      style: pathFeatureStyle(feature.properties ?? { id: `path-${index}` }),
    });
    map.addChild(item);
    bucket.push(item);
  });
}

export function syncPoiFeatures(
  map: YandexMapInstance,
  bundle: YandexMapsBundle,
  pois: MapPoisGeoJson,
  bucket: YandexMapEntity[],
  options?: { radius?: number; fill?: string },
) {
  removeMapChildren(map, bucket);
  const fill = options?.fill ?? '#FFC107';
  pois.features.forEach((feature) => {
    if (feature.geometry.type !== 'Point') return;
    const [lng, lat] = feature.geometry.coordinates;
    const el = document.createElement('div');
    el.className = 'admin-poi-marker';
    el.style.background = fill;

    const marker = new bundle.ymaps3.YMapMarker({ coordinates: [lng, lat] }, el);
    map.addChild(marker);
    bucket.push(marker);
  });
}

export function upsertImageOverlay(
  map: YandexMapInstance,
  bundle: YandexMapsBundle,
  current: YandexMapEntity | null,
  params: { bounds: YandexLngLatBounds; imageUrl: string },
): YandexMapEntity {
  if (current) {
    current.update?.({ bounds: params.bounds, imageUrl: params.imageUrl });
    return current;
  }

  const overlay = new bundle.YMapImageOverlay({
    bounds: params.bounds,
    imageUrl: params.imageUrl,
    className: 'admin-scheme-overlay',
  });
  map.addChild(overlay);
  return overlay;
}

/** @deprecated Use upsertImageOverlay */
export function replaceImageOverlay(
  map: YandexMapInstance,
  bundle: YandexMapsBundle,
  current: YandexMapEntity | null,
  params: { bounds: YandexLngLatBounds; imageUrl: string; opacity: number },
): YandexMapEntity {
  return upsertImageOverlay(map, bundle, current, params);
}

export function applySchemeOverlayStyle(
  container: HTMLElement | null | undefined,
  params: { opacity: number; rotation: number },
) {
  container?.style.setProperty('--admin-scheme-opacity', String(params.opacity));
  container?.style.setProperty('--admin-scheme-rotation', `${params.rotation}deg`);
}

export function ensureAdminMapStyles() {
  const id = 'admin-yandex-map-styles';
  if (typeof document === 'undefined' || document.getElementById(id)) return;

  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    .admin-yandex-map { width: 100%; }
    .admin-scheme-overlay {
      opacity: var(--admin-scheme-opacity, 0.85);
      transform: rotate(var(--admin-scheme-rotation, 0deg));
      transform-origin: center center;
    }
    .admin-poi-marker {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid #000;
      box-sizing: border-box;
      transform: translate(-50%, -50%);
      background: #ffc107;
    }
  `;
  document.head.appendChild(style);
}
