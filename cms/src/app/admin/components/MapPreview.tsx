'use client';

import { AdminMapCanvas } from './AdminMapCanvas';
import type { FestivalMapConfig, MapAdminOverlay, MapPathsGeoJson, MapZonesGeoJson } from '@/types';

export function MapPreview(props: {
  config: FestivalMapConfig;
  zones: MapZonesGeoJson;
  paths: MapPathsGeoJson;
  overlay?: MapAdminOverlay;
}) {
  return <AdminMapCanvas {...props} preview />;
}
