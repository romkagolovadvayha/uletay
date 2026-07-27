import type {
  FestivalMapConfig,
  MapFilterId,
  MapPathsGeoJson,
  MapPoiProperties,
  MapPoisGeoJson,
  MapZoneProperties,
  MapZonesGeoJson,
  RouteSegment,
  UserLocationState,
} from '../../types/map';

export type FestivalMapViewProps = {
  config: FestivalMapConfig;
  zones?: MapZonesGeoJson;
  pois?: MapPoisGeoJson;
  paths?: MapPathsGeoJson;
  userLocation?: UserLocationState | null;
  routeSegments?: RouteSegment[];
  selectedZoneId?: string | null;
  selectedPoiId?: string | null;
  filter: MapFilterId;
  followUser: boolean;
  onZonePress: (zone: GeoJSON.Feature<GeoJSON.Polygon, MapZoneProperties>) => void;
  onPoiPress: (poi: GeoJSON.Feature<GeoJSON.Point, MapPoiProperties>) => void;
  onMapPress?: () => void;
  onZoneRoute?: () => void;
  routing?: boolean;
  onMapReady?: (api: FestivalMapApi) => void;
  onMapLoaded?: () => void;
  onMapLoadError?: () => void;
};

export type FestivalMapApi = {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  fitRoute: (coordinates: [number, number][]) => void;
};

export type { FestivalMapViewProps as Props };
