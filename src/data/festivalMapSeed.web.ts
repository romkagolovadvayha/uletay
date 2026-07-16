import type { FestivalMapConfig, MapPathsGeoJson, MapPoisGeoJson, MapZonesGeoJson } from '../types/map';

/**
 * Web eager bundle: skip heavy GeoJSON defaults (~13 KiB+).
 * Live map data comes from the API; empty collections are only a cold-start fallback.
 */
const FESTIVAL_CENTER = { lat: 56.606975, lng: 53.622461 };

const emptyZones: MapZonesGeoJson = { type: 'FeatureCollection', features: [] };
const emptyPaths: MapPathsGeoJson = { type: 'FeatureCollection', features: [] };
const emptyPois: MapPoisGeoJson = { type: 'FeatureCollection', features: [] };

const seedConfig: FestivalMapConfig = {
  center: FESTIVAL_CENTER,
  defaultZoom: 14,
  enabled: true,
  territoryBounds: {
    sw: { lat: 56.60575, lng: 53.61875 },
    ne: { lat: 56.6084, lng: 53.62465 },
  },
};

export function getDefaultMapData() {
  return {
    festivalMap: seedConfig,
    mapZones: emptyZones,
    mapPaths: emptyPaths,
    mapPois: emptyPois,
  };
}
