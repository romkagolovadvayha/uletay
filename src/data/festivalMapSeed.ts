import type { FestivalMapConfig, MapPathsGeoJson, MapPoisGeoJson, MapZonesGeoJson } from '../types/map';
import snapshot from './festivalMapSnapshot.json';

/**
 * Snapshot generated alongside the CMS seed. An empty CMS collection still
 * replaces the snapshot rather than restoring deleted places.
 */
export function getDefaultMapData() {
  return snapshot as unknown as { festivalMap: FestivalMapConfig; mapZones: MapZonesGeoJson; mapPaths: MapPathsGeoJson; mapPois: MapPoisGeoJson };
}
