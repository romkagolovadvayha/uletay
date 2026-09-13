import { Camera, GeoJSONSource, ImageSource, Layer, Map as NativeMap, type CameraRef } from '@maplibre/maplibre-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useLatestRef } from '../../hooks/useLatestRef';
import { useMapMotion } from './MapMotionConfig';
import { configureNativeMapCache } from './map-cache.native';
import { clampZoom, dispatchMapPress, festivalBounds, mapPadding, routeBounds, validCoordinate, type SceneImage, type SceneSource } from './map-scene';
import { festivalMapStyle, MAP_MAX_ZOOM, MAP_MIN_ZOOM } from './map-style';
import { useMapCamera } from './use-map-camera';
import { useMapScene } from './use-map-scene';
import type { FestivalMapViewProps } from './types';

const captureFeatures = () => {}; // The source enriches the single bubbling Map press event.
const Source = React.memo(function Source({ id, data, layers }: SceneSource) {
  return <GeoJSONSource id={id} data={data} tolerance={0}
    onPress={id === 'zones' || id === 'places' ? captureFeatures : undefined}>
    {layers.map(layer => <Layer key={layer.id} {...layer} />)}
  </GeoJSONSource>;
});
function MapImage({ image }: { image: SceneImage }) {
  return <ImageSource id={image.id} url={image.url} coordinates={image.coordinates}>
    <Layer id={`${image.id}-raster`} type="raster" paint={{ 'raster-opacity': image.opacity, 'raster-fade-duration': 0 }} />
  </ImageSource>;
}

export function FestivalMapView(props: FestivalMapViewProps) {
  const camera = useRef<CameraRef>(null);
  const size = useRef({ width: 390, height: 700 });
  const latest = useLatestRef(props);
  const [initialized, setInitialized] = useState(false);
  const loaded = useRef(false);
  const zoom = useRef(clampZoom(props.config.defaultZoom));
  const [labelZoom, setLabelZoom] = useState(clampZoom(props.config.defaultZoom));
  const scene = useMapScene(props, labelZoom);
  const { reduceMotion } = useMapMotion();
  const motion = useLatestRef(reduceMotion);
  const attachCamera = useMapCamera(props.onMapReady);
  const style = useMemo(() => JSON.stringify(festivalMapStyle()), []);
  const [initialView] = useState(() => ({ center: [props.config.center.lng, props.config.center.lat] as [number, number], zoom: clampZoom(props.config.defaultZoom) }));

  useEffect(() => { void configureNativeMapCache(); }, []);
  useEffect(() => {
    if (!initialized) return;
    const showFestival = () => {
      const config = latest.current.config, bounds = festivalBounds(config);
      if (bounds) camera.current?.fitBounds(bounds, { padding: mapPadding(size.current.width, size.current.height), duration: 0 });
      else camera.current?.jumpTo({ center: [config.center.lng, config.center.lat], zoom: clampZoom(config.defaultZoom) });
    };
    showFestival();
    attachCamera({
      showFestival,
      zoomBy: delta => { zoom.current = clampZoom(zoom.current + delta); camera.current?.zoomTo(zoom.current, { duration: motion.current ? 0 : 250 }); },
      flyTo: (lat, lng, nextZoom = latest.current.config.defaultZoom) => {
        if (!validCoordinate({ lat, lng })) return;
        zoom.current = clampZoom(nextZoom);
        camera.current?.easeTo({ center: [lng, lat], zoom: zoom.current, duration: motion.current ? 0 : 350 });
      },
      fitRoute: coordinates => {
        const bounds = routeBounds(coordinates);
        if (!bounds) return;
        camera.current?.fitBounds(bounds, { padding: mapPadding(size.current.width, size.current.height, true), duration: motion.current ? 0 : 350 });
      },
    });
    return () => attachCamera(null);
  }, [initialized, attachCamera, latest, motion]);

  const lat = props.userLocation?.lat, lng = props.userLocation?.lng;
  useEffect(() => {
    if (!initialized || !props.followUser || lat == null || lng == null || !validCoordinate({ lat, lng })) return;
    camera.current?.easeTo({ center: [lng, lat], zoom: Math.max(16, zoom.current), duration: reduceMotion ? 0 : 350 });
  }, [initialized, props.followUser, lat, lng, reduceMotion]);

  return <NativeMap mapStyle={style} style={styles.fill} attribution logo={false} compass
    attributionPosition={{ bottom: 72, left: 8 }} compassPosition={{ bottom: 150, left: 16 }}
    dragPan touchZoom touchRotate
    onLayout={event => { size.current = event.nativeEvent.layout; }}
    onDidFinishLoadingStyle={() => setInitialized(true)}
    onDidFinishRenderingMapFully={() => {
      if (loaded.current) return;
      loaded.current = true; latest.current.onMapLoaded?.();
    }}
    onDidFailLoadingMap={() => { if (!loaded.current) latest.current.onMapLoadError?.(); }}
    onRegionWillChange={event => { if (event.nativeEvent.userInteraction) latest.current.onMapInteraction?.(); }}
    onRegionDidChange={event => {
      zoom.current = event.nativeEvent.zoom;
      setLabelZoom(Math.floor(zoom.current * 4) / 4);
    }}
    onPress={event => {
      const [pressLng, pressLat] = event.nativeEvent.lngLat;
      const features = 'features' in event.nativeEvent ? event.nativeEvent.features : [];
      dispatchMapPress(latest.current, scene.labels, features, { lat: pressLat, lng: pressLng });
    }}>
    <Camera ref={camera} initialViewState={initialView} minZoom={MAP_MIN_ZOOM} maxZoom={MAP_MAX_ZOOM} />
    {scene.images.filter(image => image.id === 'festival-plan').map(image => <MapImage key={image.id} image={image} />)}
    <Source {...scene.sources[0]} />
    {scene.images.filter(image => image.id !== 'festival-plan').map(image => <MapImage key={image.id} image={image} />)}
    {scene.sources.slice(1).map(source => <Source key={source.id} {...source} />)}
  </NativeMap>;
}
const styles = StyleSheet.create({ fill: { flex: 1, minHeight: 0 } });
