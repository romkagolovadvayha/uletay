import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Map as WebMap } from 'maplibre-gl';
import { useLatestRef } from '../../hooks/useLatestRef';
import { loadMapLibre } from './maplibre-loader.web';
import { festivalMapStyle, MAP_MAX_ZOOM, MAP_MIN_ZOOM } from './map-style';
import { clampZoom, dispatchMapPress, festivalBounds, interactiveLayers, mapPadding, routeBounds, validCoordinate } from './map-scene';
import { useMapCamera } from './use-map-camera';
import { useMapScene } from './use-map-scene';
import { useMapMotion } from './MapMotionConfig';
import { syncWebMapScene, type AppliedScene } from './web-map-scene';
import { BUNDLED_GLYPHS_URL, bundledGlyphRequest } from './map-glyphs.web';
import { MapCredits } from './MapCredits.web';
import { watchFestivalMapReady } from './map-readiness.web';
import { watchMapRecovery } from './map-recovery.web';
import type { FestivalMapViewProps } from './types';

export function FestivalMapView(props: FestivalMapViewProps) {
  'use no memo';
  const container = useRef<View>(null);
  const map = useRef<WebMap | null>(null);
  const latest = useLatestRef(props);
  const [initialized, setInitialized] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const recoveryUsed = useRef(false);
  const styleReady = useRef(false);
  const [labelZoom, setLabelZoom] = useState(clampZoom(props.config.defaultZoom));
  const scene = useMapScene(props, labelZoom);
  const currentScene = useLatestRef(scene);
  const applied = useRef<AppliedScene>({ sources: new Map(), images: new Map() });
  const { reduceMotion } = useMapMotion();
  const motion = useLatestRef(reduceMotion);
  const attachCamera = useMapCamera(props.onMapReady);

  useEffect(() => {
    let cancelled = false;
    let instance: WebMap | undefined;
    let observer: ResizeObserver | undefined;
    let stopReadiness: (() => void) | undefined;
    let stopRecovery: (() => void) | undefined;
    let ready = false;
    const fail = () => {
      if (cancelled) return;
      latest.current.onMapLoadError?.();
      if (!recoveryUsed.current && !stopRecovery) {
        stopRecovery = watchMapRecovery(() => {
          recoveryUsed.current = true;
          setInitialized(false);
          setAttempt(value => value + 1);
        });
      }
    };
    const timeout = setTimeout(() => { if (!ready) fail(); }, 30_000);
    const contextLost = (event: Event) => { event.preventDefault(); fail(); };
    const host = container.current as unknown as HTMLElement | null;
    if (!host) { clearTimeout(timeout); return; }
    void loadMapLibre().then(api => {
      if (cancelled) return;
      const config = latest.current.config;
      let cameraAttached = false;
      // Keep one style and tile cache at every zoom. Local festival geometry renders
      // independently of the optional remote basemap, including when tiles fail.
      instance = new api.Map({ container: host,
        style: festivalMapStyle({ glyphs: BUNDLED_GLYPHS_URL, dark: true }), transformRequest: bundledGlyphRequest,
        center: [config.center.lng, config.center.lat], zoom: clampZoom(config.defaultZoom),
        pitch: latest.current.viewMode === '2d' ? 0 : 36,
        minPitch: latest.current.lockViewMode ? 36 : 0, maxPitch: latest.current.lockViewMode ? 36 : 55,
        touchPitch: !latest.current.lockViewMode,
        minZoom: MAP_MIN_ZOOM, maxZoom: MAP_MAX_ZOOM, attributionControl: false, renderWorldCopies: false,
        canvasContextAttributes: { antialias: true } });
      const active = instance;
      let zoomTarget: { zoom: number; until: number } | null = null;
      map.current = active;
      active.getCanvas().addEventListener('webglcontextlost', contextLost);
      stopReadiness = watchFestivalMapReady(active, () => {
        if (cancelled) return;
        ready = true;
        clearTimeout(timeout);
        latest.current.onMapLoaded?.();
      });
      const resize = () => {
        if (cancelled) return;
        active.resize();
      };
      resize();
      active.getCanvas().setAttribute('aria-label', 'Интерактивная карта фестиваля');
      active.on('style.load', () => {
        if (cancelled) return;
        styleReady.current = true;
        applied.current = { sources: new Map(), images: new Map() };
        syncWebMapScene(active, currentScene.current, applied.current);
        setInitialized(true);
        if (cameraAttached) return;
        cameraAttached = true;
        const showFestival = () => {
          zoomTarget = null;
          const config = latest.current.config, bounds = festivalBounds(config);
          if (bounds) active.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], {
            padding: mapPadding(host.clientWidth, host.clientHeight), maxZoom: config.defaultZoom, duration: 0 });
          else active.jumpTo({ center: [config.center.lng, config.center.lat], zoom: clampZoom(config.defaultZoom) });
        };
        showFestival();
        attachCamera({
          showFestival,
          zoomBy: delta => {
            const duration = motion.current ? 0 : 250;
            const zoom = clampZoom((zoomTarget && zoomTarget.until > Date.now() ? zoomTarget.zoom : active.getZoom()) + delta);
            zoomTarget = { zoom, until: Date.now() + duration + 80 };
            active.zoomTo(zoom, { duration });
          },
          flyTo: (lat, lng, zoom = latest.current.config.defaultZoom) => {
            if (!validCoordinate({ lat, lng })) return;
            const duration = motion.current ? 0 : 350;
            zoomTarget = { zoom: clampZoom(zoom), until: Date.now() + duration + 80 };
            active.easeTo({ center: [lng, lat], zoom: zoomTarget.zoom, duration });
          },
          fitRoute: coordinates => {
            zoomTarget = null;
            const bounds = routeBounds(coordinates);
            if (!bounds) return;
            active.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { maxZoom: 19,
              padding: mapPadding(host.clientWidth, host.clientHeight, true),
              duration: motion.current ? 0 : 350 });
          },
        });
      });
      active.on('error', event => {
        // A failed individual tile must not destroy the working festival layers.
        console.warn('[FestivalMap]', event.error.message);
      });
      active.on('zoomend', () => { if (!cancelled) setLabelZoom(Math.floor(active.getZoom() * 4) / 4); });
      active.on('movestart', event => {
        if (event.originalEvent) { zoomTarget = null; latest.current.onMapInteraction?.(); }
      });
      active.on('click', event => {
        const features = active.queryRenderedFeatures(event.point, { layers: interactiveLayers.filter(id => Boolean(active.getLayer(id))) });
        dispatchMapPress(latest.current, currentScene.current.labels, features, { lat: event.lngLat.lat, lng: event.lngLat.lng });
      });
      observer = new ResizeObserver(resize);
      observer.observe(host);
    }).catch(error => {
      if (cancelled) return;
      console.error('[FestivalMap]', error);
      fail();
    });
    return () => {
      cancelled = true; clearTimeout(timeout); stopReadiness?.(); stopRecovery?.();
      observer?.disconnect(); attachCamera(null); styleReady.current = false;
      instance?.getCanvas().removeEventListener('webglcontextlost', contextLost);
      instance?.remove(); map.current = null;
      applied.current = { sources: new Map(), images: new Map() };
    };
  }, [attachCamera, currentScene, latest, motion, attempt]);

  useEffect(() => {
    if (map.current && initialized && styleReady.current) syncWebMapScene(map.current, scene, applied.current);
  }, [initialized, scene]);

  useEffect(() => {
    if (initialized) map.current?.easeTo({ pitch: props.viewMode === '2d' ? 0 : 36, duration: reduceMotion ? 0 : 300 });
  }, [initialized, props.viewMode, reduceMotion]);

  const lat = props.userLocation?.lat, lng = props.userLocation?.lng;
  useEffect(() => {
    if (!initialized || !props.followUser || lat == null || lng == null || !validCoordinate({ lat, lng })) return;
    map.current?.easeTo({ center: [lng, lat], zoom: Math.max(16, map.current.getZoom()), duration: reduceMotion ? 0 : 350 });
  }, [initialized, props.followUser, lat, lng, reduceMotion]);
  return <View style={styles.fill}>
    <View ref={container} style={styles.fill} collapsable={false} />
    <MapCredits />
  </View>;
}
const styles = StyleSheet.create({ fill: { flex: 1, minHeight: 0 } });
