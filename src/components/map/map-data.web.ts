import type { AppData } from '../../types';
import snapshot from '../../data/festivalMapSnapshot.json';
import { withOperationalPois } from '../../utils/map/poiData';

const savedMap = snapshot as Pick<AppData, 'festivalMap' | 'mapZones' | 'mapPaths' | 'mapPois'>;
const savedPois = withOperationalPois(savedMap.mapZones, savedMap.mapPois);

// Loaded with the map screen, never the eager homepage bundle. Published empty
// CMS collections remain authoritative; use the snapshot only before any data arrives.
export function resolveMapData(data: AppData, source: string): AppData {
  return source === 'fallback' ? { ...data, ...savedMap, mapPois: savedPois } : data;
}
