import type { Feature, FeatureCollection, Geometry, Point } from 'geojson';
import type { LayerSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LatLng, MapPathsGeoJson, RouteSegment, UserLocationState, UserMapMarker } from '../../types/map';
import { mapColors } from '../../theme/map';
import { buildMapPlaceMarkers, clusterMapPlaces, type MapPlaceGroup } from '../../utils/map/placeMarkers';
import { filterPoiFeatures, filterZoneFeatures } from '../../utils/map/layerStyles';
import { overlayToImageCoordinates } from '../../utils/map/overlayGeoref';
import { zoneImageLayout, zoneFillImageCoordinates } from '../../utils/map/zoneFillImage';
import { MAP_FONT, MAP_MAX_ZOOM, MAP_MIN_ZOOM } from './map-style';
import type { FestivalMapViewProps } from './types';

export type SceneData = FeatureCollection<Geometry, Record<string, unknown>>;
export type SceneLayer = Extract<LayerSpecification, { type: 'fill' | 'line' | 'circle' | 'symbol' }>;
export type SceneSource = { id: string; data: SceneData; layers: SceneLayer[] };
export type SceneImage = { id: string; url: string; coordinates: ReturnType<typeof overlayToImageCoordinates>; opacity: number };
export const collection = (features: Feature<Geometry, Record<string, unknown>>[] = []): SceneData => ({ type: 'FeatureCollection', features });
const point = (coordinates: number[], properties: Record<string, unknown>): Feature<Point, Record<string, unknown>> => ({
  type: 'Feature', geometry: { type: 'Point', coordinates }, properties,
});
export const validCoordinate = (p?: LatLng | null): p is LatLng => Boolean(p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 85.051129 && Math.abs(p.lng) <= 180);
export const clampZoom = (zoom: number) => Math.max(MAP_MIN_ZOOM, Math.min(MAP_MAX_ZOOM, Number.isFinite(zoom) ? zoom : 16));
export function mapPadding(width: number, height: number, route = false) {
  return { top: Math.min(130, height * 0.22), right: Math.min(55, width * 0.15),
    bottom: Math.min(route ? 240 : 90, height * 0.4), left: Math.min(35, width * 0.1) };
}
export function festivalBounds(config: FestivalMapViewProps['config']) {
  const bounds = config.territoryBounds;
  return bounds ? routeBounds([[bounds.sw.lng, bounds.sw.lat], [bounds.ne.lng, bounds.ne.lat]]) : null;
}
export function routeBounds(coordinates: [number, number][]): [number, number, number, number] | null {
  const valid = coordinates.filter(([lng, lat]) => validCoordinate({ lat, lng }));
  if (!valid.length) return null;
  return [Math.min(...valid.map(p => p[0])), Math.min(...valid.map(p => p[1])), Math.max(...valid.map(p => p[0])), Math.max(...valid.map(p => p[1]))];
}

export function buildPlaceScene(props: Pick<FestivalMapViewProps, 'zones' | 'pois' | 'filter' | 'selectedZoneId' | 'selectedPoiId'>) {
  const zones = filterZoneFeatures(props.zones?.features ?? [], props.filter);
  const pois = filterPoiFeatures(props.pois?.features ?? [], props.filter).filter(p => !p.properties.sourceZoneId);
  const shapes = zones.flatMap(zone => [zone.geometry, ...(zone.properties.geometryParts ?? [])].map((geometry, index) => ({
    type: 'Feature' as const, id: `${zone.properties.id}:${index}`, geometry,
    properties: { zoneId: zone.properties.id, child: Boolean(zone.properties.parentZoneId),
      color: zone.properties.fillColor || mapColors.zoneFallback,
      opacity: zone.properties.fillOpacity ?? 0.45,
      stroke: zone.properties.id === props.selectedZoneId ? '#FFFFFF' : zone.properties.strokeColor || zone.properties.fillColor || mapColors.zoneFallback,
      width: zone.properties.id === props.selectedZoneId ? 3 : zone.properties.strokeWidth ?? 1 },
  })));
  // Draw child pitches above their parent so both platforms select the same place.
  shapes.sort((a, b) => Number(a.properties.child) - Number(b.properties.child));
  return { zones, pois, shapes: collection(shapes),
    rows: collection(zones.flatMap(zone => (zone.properties.layoutRings ?? []).map(coordinates => ({
      type: 'Feature' as const, geometry: { type: 'LineString' as const, coordinates }, properties: {},
    })))),
    markers: buildMapPlaceMarkers(zones, pois, props.selectedZoneId, props.selectedPoiId) };
}

export function buildPlaceLabels(markers: ReturnType<typeof buildMapPlaceMarkers>, zoom: number) {
  // MapLibre uses 512px world tiles; the existing label geometry uses 256px.
  const groups = clusterMapPlaces(markers, zoom + 1);
  const byKey = new Map<string, MapPlaceGroup>();
  const features = groups.map(group => {
    const place = group.places[0], clustered = group.places.length > 1;
    const key = group.places.map(p => `${p.kind}:${p.id}`).join('|');
    byKey.set(key, group);
    let label = clustered ? String(group.places.length) : place.glyph;
    let size = 12, rotation = 0, footprint = false;
    if (place.layout && !clustered) {
      const layout = place.layout;
      const mpp = 78271.51696 * Math.cos(layout.center.lat * Math.PI / 180) / 2 ** zoom;
      const lines = (place.label || place.name).split('\n');
      size = Math.min(place.isArea ? 16 : 12, (layout.widthMeters / mpp - 4) / Math.max(...lines.map(line => line.length * 0.68)),
        (layout.heightMeters / mpp - 4) / (lines.length * 1.3));
      footprint = size >= (place.isPitch ? 6 : 8) || Boolean(place.isArea || place.isPitch);
      if (footprint) { label = lines.join('\n'); rotation = layout.rotation; }
      else size = 12;
    }
    return point(group.coordinates, { groupKey: key, label, size: Math.max(1, size), rotation, footprint,
      visible: !footprint || size >= (place.isPitch ? 6 : 8), selected: place.selected,
      color: place.selected ? '#FFD400' : footprint ? place.labelColor ?? '#F2F0DD' : place.color,
      halo: footprint && !place.selected && place.labelColor === '#263124' ? '#F5F2E5' : '#202724' });
  });
  return { data: collection(features), byKey };
}

export function buildPaths(paths?: MapPathsGeoJson): SceneData {
  return collection((paths?.features ?? []).filter(p => !p.properties.routingOnly).map(p => ({ ...p,
    properties: { ...p.properties, color: p.properties.closed ? '#FF818A' : p.properties.pathKind === 'fence' ? '#E45443' : p.properties.pathKind === 'walkway' ? '#CCD1AB' : '#B6B7A7',
      width: p.properties.closed ? 4 : p.properties.pathKind === 'fence' ? 2 : p.properties.pathKind === 'walkway' ? 2.5 : 5,
      dashed: Boolean(p.properties.closed || p.properties.pathKind === 'fence' || p.properties.pathKind === 'walkway') },
  })));
}
export function buildRoutes(routes?: RouteSegment[]): SceneData {
  return collection((routes ?? []).filter(r => r.coordinates.length >= 2).map((r, i) => ({
    type: 'Feature', id: `route-${i}`, geometry: { type: 'LineString', coordinates: r.coordinates },
    properties: { kind: r.kind, color: r.kind === 'external' ? mapColors.routeExternal : mapColors.routeInternal },
  })));
}
export const buildUserLocation = (location?: UserLocationState | null) => collection(validCoordinate(location)
  ? [point([location.lng, location.lat], {})] : []);
export const buildSavedPlaces = (markers?: UserMapMarker[]) => collection((markers ?? []).filter(m => validCoordinate(m.coordinate))
  .map(m => point([m.coordinate.lng, m.coordinate.lat], { label: m.kind === 'car' ? 'Моя машина' : 'Моя палатка' })));

export function buildSceneImages(config: FestivalMapViewProps['config'], zones: ReturnType<typeof buildPlaceScene>['zones'], resolveUrl: (url?: string) => string | undefined): SceneImage[] {
  const images: SceneImage[] = [];
  const overlay = config.adminOverlay, overlayUrl = resolveUrl(overlay?.imageUrl);
  if (overlay && overlayUrl) images.push({ id: 'festival-plan', url: overlayUrl, coordinates: overlayToImageCoordinates({ ...overlay, rotation: -(overlay.rotation ?? 0) }), opacity: overlay.opacity ?? 0.85 });
  for (const zone of zones) {
    const url = resolveUrl(zone.properties.fillImageUrl);
    if (!url) continue;
    const layout = zoneImageLayout(zone);
    images.push({ id: `image-${zone.properties.id}`, url,
      // Stored label/image rotation is clockwise in screen space; image corners use geographic rotation.
      coordinates: zoneFillImageCoordinates(layout, -(zone.properties.fillImageRotation ?? layout.rotation)),
      opacity: zone.properties.fillImageOpacity ?? 0.92 });
  }
  return images;
}

export const sceneLayers: Record<string, SceneLayer[]> = {
  zones: [
    { id: 'fest-zone-fill', type: 'fill', source: 'zones', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['get', 'opacity'] } },
    { id: 'fest-zone-outline', type: 'line', source: 'zones', paint: { 'line-color': ['get', 'stroke'], 'line-width': ['get', 'width'] } },
  ],
  rows: [{ id: 'fest-rows', type: 'line', source: 'rows', paint: { 'line-color': '#C2AD78', 'line-width': 0.7, 'line-opacity': 0.5 } }],
  paths: [
    { id: 'fest-paths', type: 'line', source: 'paths', filter: ['!', ['get', 'dashed']], layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': ['get', 'color'], 'line-width': ['get', 'width'] } },
    { id: 'fest-paths-dashed', type: 'line', source: 'paths', filter: ['get', 'dashed'], layout: { 'line-cap': 'round' },
      paint: { 'line-color': ['get', 'color'], 'line-width': ['get', 'width'], 'line-dasharray': [1, 2] } },
  ],
  routes: [
    { id: 'fest-route-outline', type: 'line', source: 'routes', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#202724', 'line-width': 9 } },
    { id: 'fest-route-internal', type: 'line', source: 'routes', filter: ['!=', ['get', 'kind'], 'external'],
      layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': 6 } },
    { id: 'fest-route-external', type: 'line', source: 'routes', filter: ['==', ['get', 'kind'], 'external'],
      paint: { 'line-color': ['get', 'color'], 'line-width': 4, 'line-dasharray': [2, 2] } },
  ],
  places: [
    { id: 'fest-place-dot', type: 'circle', source: 'places', filter: ['!', ['get', 'footprint']],
      paint: { 'circle-radius': 15, 'circle-color': '#20242A', 'circle-stroke-width': 1.5, 'circle-stroke-color': ['get', 'color'] } },
    { id: 'fest-place-label', type: 'symbol', source: 'places', filter: ['get', 'visible'],
      layout: { 'text-field': ['get', 'label'], 'text-font': [MAP_FONT], 'text-size': ['get', 'size'], 'text-rotate': ['get', 'rotation'],
        'text-rotation-alignment': 'map', 'text-allow-overlap': true, 'text-ignore-placement': true, 'text-max-width': 100, 'text-line-height': 1.2 },
      paint: { 'text-color': ['get', 'color'], 'text-halo-color': ['get', 'halo'], 'text-halo-width': 1 } },
  ],
  saved: [
    { id: 'fest-saved-dot', type: 'circle', source: 'saved', paint: { 'circle-radius': 8, 'circle-color': '#FFD400', 'circle-stroke-width': 2, 'circle-stroke-color': '#FFFFFF' } },
    { id: 'fest-saved-label', type: 'symbol', source: 'saved', layout: { 'text-field': ['get', 'label'], 'text-font': [MAP_FONT], 'text-size': 12, 'text-offset': [0, 1.5], 'text-allow-overlap': true },
      paint: { 'text-color': '#FFD400', 'text-halo-color': '#202724', 'text-halo-width': 2 } },
  ],
  user: [{ id: 'fest-user', type: 'circle', source: 'user', paint: { 'circle-radius': 7, 'circle-color': mapColors.userDot, 'circle-stroke-width': 3, 'circle-stroke-color': '#FFFFFF' } }],
};
export const interactiveLayers = ['fest-place-dot', 'fest-place-label', 'fest-zone-fill'];

export function dispatchMapPress(props: FestivalMapViewProps, labels: ReturnType<typeof buildPlaceLabels>, features: Feature[], coordinate: LatLng) {
  if (!props.coordinatePicking) {
    for (const feature of features) {
      const group = labels.byKey.get(String(feature.properties?.groupKey));
      if (!group) continue;
      if (group.places.length > 1) { props.onPlacesPress?.(group.places); return; }
      const place = group.places[0];
      if (place.kind === 'zone') {
        const zone = props.zones?.features.find(z => z.properties.id === place.id);
        if (zone) { props.onZonePress(zone); return; }
      } else {
        const poi = props.pois?.features.find(p => p.properties.id === place.id);
        if (poi) { props.onPoiPress(poi); return; }
      }
    }
    const zones = features.filter(f => f.properties?.zoneId).sort((a, b) => Number(Boolean(b.properties?.child)) - Number(Boolean(a.properties?.child)));
    for (const feature of zones) {
      const zone = props.zones?.features.find(z => z.properties.id === feature.properties?.zoneId);
      if (zone) { props.onZonePress(zone); return; }
    }
  }
  if (validCoordinate(coordinate) && props.onMapCoordinatePress) props.onMapCoordinatePress(coordinate);
  else props.onMapPress?.();
}
