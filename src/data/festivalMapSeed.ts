import type { MapPoisGeoJson } from '../types/map';
import { getDefaultMapData as getOfflineMapData } from './festivalMap';

const emptyPois: MapPoisGeoJson = { type: 'FeatureCollection', features: [] };

/**
 * Native offline geometry remains available, but POIs are CMS-owned.
 * An empty CMS collection must stay empty instead of showing invented services.
 */
export function getDefaultMapData() {
  return {
    ...getOfflineMapData(),
    mapPois: emptyPois,
  };
}
