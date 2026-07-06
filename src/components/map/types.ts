import type {
  FestivalMapConfig,
  MapFilterId,
  MapPathsGeoJson,
  MapZoneProperties,
  MapZonesGeoJson,
  RouteSegment,
  UserLocationState,
} from '../../types/map';

export type FestivalMapViewProps = {
  config: FestivalMapConfig;
  zones?: MapZonesGeoJson;
  paths?: MapPathsGeoJson;
  userLocation?: UserLocationState | null;
  routeSegments?: RouteSegment[];
  selectedZoneId?: string | null;
  filter: MapFilterId;
  followUser: boolean;
  onZonePress: (zone: GeoJSON.Feature<GeoJSON.Polygon, MapZoneProperties>) => void;
  onMapPress?: () => void;
  onZoneRoute?: () => void;
  routing?: boolean;
  onMapReady?: (api: FestivalMapApi) => void;
};

export type FestivalMapApi = {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  fitRoute: (coordinates: [number, number][]) => void;
};

export type { FestivalMapViewProps as Props };
