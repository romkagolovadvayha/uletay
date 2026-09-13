import type { LayerSpecification, StyleSpecification } from 'maplibre-gl';

export const MAP_FONT = 'Noto Sans Regular';
export const MAP_MIN_ZOOM = 3;
export const MAP_MAX_ZOOM = 21;

// Shipped with the app, like taxi: no remote style script or provider API key.
export function festivalMapStyle(): StyleSpecification {
  return {
    version: 8,
    name: 'Улетай',
    light: { anchor: 'viewport', color: '#FFFFFF', intensity: .32, position: [1.5, 210, 35] },
    glyphs: process.env.EXPO_PUBLIC_MAP_GLYPHS_URL || 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: { openmaptiles: {
      type: 'vector', url: process.env.EXPO_PUBLIC_MAP_TILES_URL || 'https://tiles.openfreemap.org/planet',
      attribution: '<a href="https://openfreemap.org/">OpenFreeMap</a> © <a href="https://openmaptiles.org/">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    } },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#EDCD80' } },
      { id: 'landcover', type: 'fill', source: 'openmaptiles', 'source-layer': 'landcover',
        paint: { 'fill-color': '#B1BD71', 'fill-opacity': .5 } },
      { id: 'park', type: 'fill', source: 'openmaptiles', 'source-layer': 'park', paint: { 'fill-color': '#A8BB62' } },
      { id: 'water', type: 'fill', source: 'openmaptiles', 'source-layer': 'water', paint: { 'fill-color': '#294D62' } },
      { id: 'waterway', type: 'line', source: 'openmaptiles', 'source-layer': 'waterway', paint: { 'line-color': '#294D62', 'line-width': 2 } },
      { id: 'roads', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#454642', 'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 6, 0.5, 12, 2, 16, 6, 20, 24] } },
      { id: 'buildings', type: 'fill', source: 'openmaptiles', 'source-layer': 'building', minzoom: 14,
        paint: { 'fill-color': '#686557', 'fill-outline-color': '#8E8A78' } },
      ...(['place', 'transportation_name'] as const).map((sourceLayer): LayerSpecification => ({
        id: `base-${sourceLayer}`, type: 'symbol', source: 'openmaptiles', 'source-layer': sourceLayer,
        minzoom: sourceLayer === 'place' ? 6 : 13,
        layout: { 'symbol-placement': sourceLayer === 'place' ? 'point' : 'line',
          'text-field': ['coalesce', ['get', 'name:ru'], ['get', 'name'], ''], 'text-font': [MAP_FONT], 'text-size': 12 },
        paint: { 'text-color': '#D4D6C8', 'text-halo-color': '#202724', 'text-halo-width': 1.5 },
      })),
    ],
  };
}
