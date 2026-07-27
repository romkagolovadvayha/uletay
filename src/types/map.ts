export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapAdminOverlay {
  imageUrl: string;
  opacity?: number;
  center: LatLng;
  widthMeters: number;
  aspectRatio?: number;
  rotation?: number;
}

export interface FestivalMapConfig {
  center: LatLng;
  defaultZoom: number;
  enabled: boolean;
  territoryBounds?: { sw: LatLng; ne: LatLng };
  adminOverlay?: MapAdminOverlay;
}

export type MapZoneType =
  | 'building'
  | 'camping'
  | 'parking'
  | 'autocamp'
  | 'comfort'
  | 'trade'
  | 'stage_area'
  | 'service'
  | 'toilet'
  | 'shower'
  | 'water'
  | 'fence'
  | 'custom';

export interface MapZoneProperties {
  id: string;
  name: string;
  zoneType: MapZoneType;
  fillColor: string;
  fillOpacity: number;
  strokeColor?: string;
  strokeWidth?: number;
  description?: string;
  extrusionHeight?: number;
  /** Подпись на карте (по умолчанию — для зданий и сервисных объектов) */
  showLabel?: boolean;
  /** Фоновое изображение внутри полигона */
  fillImageUrl?: string;
  fillImageOpacity?: number;
  /** Поворот фона внутри полигона (°), по умолчанию как у формы */
  fillImageRotation?: number;
  /** Поворот подписи внутри полигона (°), по умолчанию как у формы */
  labelRotation?: number;
  layout?: {
    center: LatLng;
    widthMeters: number;
    heightMeters: number;
    rotation: number;
  };
}

export type MapPathProperties = {
  id: string;
  name?: string;
  pathKind?: 'road' | 'walkway' | 'fence';
  /** Temporarily removes the segment from visitor routing without deleting it. */
  closed?: boolean;
};

export type MapPoiCategory =
  | 'stage'
  | 'foodcourt'
  | 'toilet'
  | 'shower'
  | 'water'
  | 'medical'
  | 'security'
  | 'info'
  | 'entrance'
  | 'parking'
  | 'custom';

export interface MapPoiLink {
  type: 'stage' | 'foodcourt' | 'none';
  id?: string;
}

export interface MapPoiProperties {
  id: string;
  name: string;
  category: MapPoiCategory;
  description?: string;
  link?: MapPoiLink;
  /** Explicit visitor-facing entrance used as the route destination. */
  accessPoint?: LatLng;
  emergencyCode?: string;
  phone?: string;
  hours?: string;
  status?: 'open' | 'closed' | 'unknown';
  /** Internal link for POIs derived from an existing zone; these POIs are not rendered as duplicate markers. */
  sourceZoneId?: string;
}

export type MapPathsGeoJson = GeoJSON.FeatureCollection<
  GeoJSON.LineString,
  MapPathProperties
>;

export type MapZonesGeoJson = GeoJSON.FeatureCollection<
  GeoJSON.Polygon,
  MapZoneProperties
>;

export type MapPoisGeoJson = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  MapPoiProperties
>;

export type MapViewMode = '2d' | '3d';

export type MapFilterId = 'all' | MapZoneType | MapPoiCategory;

export type UserMapMarkerKind = 'car' | 'tent';

export interface UserMapMarker {
  kind: UserMapMarkerKind;
  coordinate: LatLng;
  savedAt: number;
  accuracy?: number | null;
}

export interface UserLocationState {
  lat: number;
  lng: number;
  accuracy: number | null;
}

export type RouteSegmentKind = 'external' | 'internal' | 'connector';

export interface RouteSegment {
  kind: RouteSegmentKind;
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

export interface CombinedRoute {
  segments: RouteSegment[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  summary: string;
}
