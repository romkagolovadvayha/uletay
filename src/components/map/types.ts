import type {
  FestivalMapConfig,
  MapFilterId,
  MapPathsGeoJson,
  MapPoiProperties,
  MapPoisGeoJson,
  MapZoneProperties,
  MapZonesGeoJson,
  RouteSegment,
  UserMapMarker,
  UserLocationState,
} from '../../types/map';
import type { MapPlaceMarker } from '../../utils/map/placeMarkers';

export type FestivalMapViewProps = {
  config: FestivalMapConfig;
  zones?: MapZonesGeoJson;
  pois?: MapPoisGeoJson;
  paths?: MapPathsGeoJson;
  userLocation?: UserLocationState | null;
  userMarkers?: UserMapMarker[];
  routeSegments?: RouteSegment[];
  selectedZoneId?: string | null;
  selectedPoiId?: string | null;
  filter: MapFilterId;
  followUser: boolean;
  onZonePress: (zone: GeoJSON.Feature<GeoJSON.Polygon, MapZoneProperties>) => void;
  onPoiPress: (poi: GeoJSON.Feature<GeoJSON.Point, MapPoiProperties>) => void;
  onPlacesPress?: (places: MapPlaceMarker[]) => void;
  onMapPress?: () => void;
  onMapCoordinatePress?: (coordinate: { lat: number; lng: number }) => void;
  onZoneRoute?: () => void;
  routing?: boolean;
  onMapReady?: (api: FestivalMapApi) => void;
  onMapLoaded?: () => void;
  onMapLoadError?: () => void;
};

export type FestivalMapApi = {
  zoomBy?: (delta: number) => void;
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  fitRoute: (coordinates: [number, number][]) => void;
};

export type { FestivalMapViewProps as Props };
