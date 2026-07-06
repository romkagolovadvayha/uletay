'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { overlayToYandexLayoutBounds } from '@/lib/map-overlay-georef';
import {
  applySchemeOverlayStyle,
  ensureAdminMapStyles,
  removeMapChildren,
  upsertImageOverlay,
  syncPathFeatures,
  syncZoneFeatures,
} from '@/lib/admin-yandex-map-layers';
import { YANDEX_MAPS_API_KEY } from '@/lib/yandex-maps-config';
import { loadYandexMaps, type YandexMapsBundle } from '@/lib/yandex-maps-loader';
import type {
  FestivalMapConfig,
  MapAdminOverlay,
  MapPathsGeoJson,
  MapZonesGeoJson,
} from '@/types';

type Props = {
  config: FestivalMapConfig;
  zones: MapZonesGeoJson;
  paths: MapPathsGeoJson;
  overlay?: MapAdminOverlay;
};

export function MapPreview({ config, zones, paths, overlay }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<YandexMapInstance | null>(null);
  const bundleRef = useRef<YandexMapsBundle | null>(null);
  const zoneRef = useRef<YandexMapEntity[]>([]);
  const pathRef = useRef<YandexMapEntity[]>([]);
  const overlayRef = useRef<YandexMapEntity | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const overlayBounds = useMemo(() => {
    if (overlay?.center && overlay.widthMeters) {
      return overlayToYandexLayoutBounds(overlay);
    }
    if (overlay?.imageUrl && config.territoryBounds) {
      const { sw, ne } = config.territoryBounds;
      return [
        [sw.lng, sw.lat],
        [ne.lng, ne.lat],
      ] as YandexLngLatBounds;
    }
    return null;
  }, [overlay, config.territoryBounds]);

  useEffect(() => {
    if (!YANDEX_MAPS_API_KEY || !containerRef.current || mapRef.current) return;

    ensureAdminMapStyles();
    containerRef.current.classList.add('admin-yandex-map');
    let cancelled = false;

    void (async () => {
      try {
        const bundle = await loadYandexMaps();
        if (cancelled || !containerRef.current) return;

        bundleRef.current = bundle;
        const { ymaps3 } = bundle;
        const map = new ymaps3.YMap(
          containerRef.current,
          {
            location: {
              center: [config.center.lng, config.center.lat],
              zoom: config.defaultZoom,
            },
            showScaleInCopyrights: true,
            behaviors: ['drag', 'scrollZoom', 'pinchZoom', 'dblClick'],
          },
          [
            new ymaps3.YMapDefaultSchemeLayer({ theme: 'dark' }),
            new ymaps3.YMapDefaultFeaturesLayer({}),
          ],
        );

        mapRef.current = map;
        setReady(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Не удалось загрузить Yandex Maps';
        if (!cancelled) setInitError(message);
      }
    })();

    return () => {
      cancelled = true;
      setReady(false);
      const map = mapRef.current;
      if (map) {
        /* eslint-disable react-hooks/exhaustive-deps -- Yandex map entities are torn down on unmount */
        const zones = zoneRef.current;
        const paths = pathRef.current;
        /* eslint-enable react-hooks/exhaustive-deps */
        if (overlayRef.current) map.removeChild(overlayRef.current);
        removeMapChildren(map, zones);
        removeMapChildren(map, paths);
        map.destroy?.();
      }
      mapRef.current = null;
      bundleRef.current = null;
      overlayRef.current = null;
    };
  }, [config.center.lat, config.center.lng, config.defaultZoom]);

  useEffect(() => {
    const map = mapRef.current;
    const bundle = bundleRef.current;
    if (!map || !ready || !bundle) return;

    syncZoneFeatures(map, bundle, zones, zoneRef.current);
    syncPathFeatures(map, bundle, paths, pathRef.current);

    if (overlay?.imageUrl && overlayBounds) {
      applySchemeOverlayStyle(containerRef.current, {
        opacity: overlay.opacity ?? 0.5,
        rotation: overlay.rotation ?? 0,
      });
      overlayRef.current = upsertImageOverlay(map, bundle, overlayRef.current, {
        bounds: overlayBounds,
        imageUrl: overlay.imageUrl,
      });
    } else if (overlayRef.current) {
      map.removeChild(overlayRef.current);
      overlayRef.current = null;
    }
  }, [ready, zones, paths, overlay, overlayBounds]);

  if (!YANDEX_MAPS_API_KEY) {
    return (
      <div className="map-preview map-preview--loading">
        Задайте NEXT_PUBLIC_YANDEX_MAPS_API_KEY в cms/.env
      </div>
    );
  }

  if (initError) {
    return <div className="map-preview map-preview--loading">{initError}</div>;
  }

  return <div ref={containerRef} className="map-preview admin-yandex-map" />;
}
