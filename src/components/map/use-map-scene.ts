import { useMemo } from 'react';
import { resolveMediaUrl } from '../../config/api';
import { buildPaths, buildPlaceLabels, buildPlaceScene, buildRoutes, buildSavedPlaces, buildSceneImages, buildSiteGround, buildUserLocation, sceneLayers } from './map-scene';
import type { FestivalMapViewProps } from './types';

export function useMapScene(props: FestivalMapViewProps, zoom: number) {
  const places = useMemo(() => buildPlaceScene(props), [props.zones, props.pois, props.filter, props.selectedZoneId, props.selectedPoiId]); // eslint-disable-line react-hooks/exhaustive-deps
  const labels = useMemo(() => buildPlaceLabels(places.markers, zoom), [places.markers, zoom]);
  const paths = useMemo(() => buildPaths(props.paths, props.zones), [props.paths, props.zones]);
  const routes = useMemo(() => buildRoutes(props.routeSegments), [props.routeSegments]);
  const saved = useMemo(() => buildSavedPlaces(props.userMarkers), [props.userMarkers]);
  const user = useMemo(() => buildUserLocation(props.userLocation), [props.userLocation]);
  const ground = useMemo(() => buildSiteGround(props.config), [props.config]);
  const images = useMemo(() => buildSceneImages(props.config, places.zones, resolveMediaUrl), [props.config, places.zones]);
  // GPS and route updates retain the large zone source and its layers.
  const sources = useMemo(() => Object.entries({ ground, zones: places.shapes, rows: places.rows, paths, routes, lettering: places.lettering, places: labels.data, saved, user })
    .map(([id, data]) => ({ id, data, layers: sceneLayers[id] })), [ground, places.shapes, places.rows, places.lettering, paths, routes, labels.data, saved, user]);
  return { sources, images, labels };
}
