'use client';

import { ContentRevision } from './ContentRevision';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useLatestRef } from '@/hooks/useLatestRef';
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
  uploadAction: (formData: FormData) => void | Promise<void>;
  saveGeorefAction: (formData: FormData) => void | Promise<void>;
  removeOverlayAction: (formData: FormData) => void | Promise<void>;
};

type GeorefState = {
  centerLat: number;
  centerLng: number;
  widthMeters: number;
  aspectRatio: number;
  rotation: number;
  opacity: number;
};

const METERS_PER_DEG_LAT = 111_320;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildInitialState(config: FestivalMapConfig, overlay?: MapAdminOverlay): GeorefState {
  const bounds = config.territoryBounds;
  const fallbackWidth = bounds
    ? (bounds.ne.lng - bounds.sw.lng) *
      METERS_PER_DEG_LAT *
      Math.cos((((bounds.sw.lat + bounds.ne.lat) / 2) * Math.PI) / 180)
    : 650;

  return {
    centerLat: overlay?.center.lat ?? config.center.lat,
    centerLng: overlay?.center.lng ?? config.center.lng,
    widthMeters: overlay?.widthMeters ?? fallbackWidth,
    aspectRatio: overlay?.aspectRatio ?? 0.72,
    rotation: overlay?.rotation ?? 0,
    opacity: overlay?.opacity ?? 0.5,
  };
}

function nudgeCenter(lat: number, lng: number, northM: number, eastM: number) {
  return {
    centerLat: lat + northM / METERS_PER_DEG_LAT,
    centerLng: lng + eastM / (METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180)),
  };
}

type FineControlProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  display?: string;
  onChange: (value: number) => void;
  nudge?: { label: string; delta: number }[];
};

function FineControl({
  label,
  value,
  min,
  max,
  step,
  unit,
  display,
  onChange,
  nudge = [],
}: FineControlProps) {
  return (
    <div className="overlay-fine-control">
      <span className="overlay-fine-label">{label}</span>
      <div className="overlay-fine-row">
        {nudge.map((item) => (
          <button
            key={item.label}
            type="button"
            className="btn-mini"
            onClick={() => onChange(clamp(Number((value + item.delta).toFixed(4)), min, max))}
          >
            {item.label}
          </button>
        ))}
        <input
          type="number"
          className="overlay-number"
          min={min}
          max={max}
          step={step}
          value={Number(value.toFixed(4))}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (Number.isFinite(next)) onChange(clamp(next, min, max));
          }}
        />
        <span className="overlay-value">{display ?? `${value}${unit}`}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function MapOverlayEditor({
  config,
  zones,
  paths,
  overlay,
  uploadAction,
  saveGeorefAction,
  removeOverlayAction,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<YandexMapInstance | null>(null);
  const bundleRef = useRef<YandexMapsBundle | null>(null);
  const zoneRef = useRef<YandexMapEntity[]>([]);
  const pathRef = useRef<YandexMapEntity[]>([]);
  const overlayRef = useRef<YandexMapEntity | null>(null);
  const dragMarkerRef = useRef<YandexMapEntity | null>(null);
  const draggingRef = useRef(false);
  const dragCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [showVectors, setShowVectors] = useState(true);
  const [state, setState] = useState(() => buildInitialState(config, overlay));
  const stateRef = useLatestRef(state);

  const patchState = useCallback((patch: Partial<GeorefState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const imageUrl = overlay?.imageUrl;
  const georefPreview = useMemo(
    () =>
      overlayToYandexLayoutBounds({
        center: { lat: state.centerLat, lng: state.centerLng },
        widthMeters: state.widthMeters,
        aspectRatio: state.aspectRatio,
      }),
    [state.centerLat, state.centerLng, state.widthMeters, state.aspectRatio],
  );

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
        if (dragMarkerRef.current) map.removeChild(dragMarkerRef.current);
        removeMapChildren(map, zones);
        removeMapChildren(map, paths);
        map.destroy?.();
      }
      mapRef.current = null;
      bundleRef.current = null;
      overlayRef.current = null;
      dragMarkerRef.current = null;
    };
  }, [config.center.lat, config.center.lng, config.defaultZoom]);

  useEffect(() => {
    const map = mapRef.current;
    const bundle = bundleRef.current;
    if (!map || !ready || !bundle) return;

    if (showVectors) {
      syncZoneFeatures(map, bundle, zones, zoneRef.current);
      syncPathFeatures(map, bundle, paths, pathRef.current);
    } else {
      removeMapChildren(map, zoneRef.current);
      removeMapChildren(map, pathRef.current);
    }
  }, [ready, zones, paths, showVectors]);

  useEffect(() => {
    const map = mapRef.current;
    const bundle = bundleRef.current;
    if (!map || !ready || !bundle || !imageUrl) {
      if (overlayRef.current && map) {
        map.removeChild(overlayRef.current);
        overlayRef.current = null;
      }
      return;
    }

    if (draggingRef.current) return;

    applySchemeOverlayStyle(containerRef.current, {
      opacity: state.opacity,
      rotation: state.rotation,
    });
    overlayRef.current = upsertImageOverlay(map, bundle, overlayRef.current, {
      bounds: georefPreview,
      imageUrl,
    });

    if (dragMarkerRef.current) {
      const handle = dragMarkerRef.current;
      map.removeChild(handle);
      map.addChild(handle);
    }
  }, [ready, imageUrl, georefPreview, state.opacity, state.rotation]);

  useEffect(() => {
    const map = mapRef.current;
    const bundle = bundleRef.current;
    if (!map || !ready || !bundle || !imageUrl) {
      if (dragMarkerRef.current && map) {
        map.removeChild(dragMarkerRef.current);
        dragMarkerRef.current = null;
      }
      return;
    }

    if (!dragMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'overlay-drag-handle';
      el.title = 'Перетащите схему';

      const marker = new bundle.ymaps3.YMapMarker(
        {
          coordinates: [state.centerLng, state.centerLat],
          draggable: true,
          zIndex: 2500,
          blockBehaviors: true,
          onDragStart: () => {
            draggingRef.current = true;
          },
          onDragMove: (coordinates: YandexLngLat) => {
            dragMarkerRef.current?.update?.({ coordinates });
            dragCenterRef.current = { lat: coordinates[1], lng: coordinates[0] };
            const s = stateRef.current;
            overlayRef.current?.update?.({
              bounds: overlayToYandexLayoutBounds({
                center: dragCenterRef.current,
                widthMeters: s.widthMeters,
                aspectRatio: s.aspectRatio,
              }),
              imageUrl: imageUrl!,
            });
          },
          onDragEnd: () => {
            draggingRef.current = false;
            const center = dragCenterRef.current;
            if (center) {
              setState((prev) => ({ ...prev, centerLat: center.lat, centerLng: center.lng }));
            }
          },
        },
        el,
      );
      map.addChild(marker);
      dragMarkerRef.current = marker;
    } else if (!draggingRef.current) {
      dragMarkerRef.current.update?.({ coordinates: [state.centerLng, state.centerLat] });
    }
  }, [ready, imageUrl, state.centerLat, state.centerLng, stateRef]);

  return (
    <div className="panel overlay-editor">
      <h2>PNG-схема на карте</h2>
      <p className="hint">
        Перетащите жёлтый маркер на карте. Для точной подгонки используйте числовые поля и кнопки
        ± — шаг поворота 0.1°, сдвига 1 м.
      </p>

      <div className="overlay-editor-toolbar">
        <form
          action={uploadAction}
          className="overlay-upload"
          onSubmit={(e) => {
            const input = e.currentTarget.querySelector<HTMLInputElement>('input[type="file"]');
            if (!input?.files?.length) {
              e.preventDefault();
              window.alert('Сначала выберите PNG или JPEG файл');
            }
          }}
        >
          <label className="file-label">
            PNG / JPEG
            <input type="file" name="file" accept="image/png,image/jpeg,image/webp" />
          </label>
          <button type="submit" className="btn-secondary">
            Загрузить
          </button>
        <ContentRevision />
</form>

        {imageUrl ? (
          <>
            <label className="overlay-toggle">
              <input
                type="checkbox"
                checked={showVectors}
                onChange={(e) => setShowVectors(e.target.checked)}
              />
              Векторные слои
            </label>
            <form action={removeOverlayAction}>
              <button type="submit" className="link-button danger">
                Удалить схему
              </button>
            <ContentRevision />
</form>
          </>
        ) : null}
      </div>

      {!YANDEX_MAPS_API_KEY ? (
        <div className="map-preview map-preview--loading overlay-editor-map">
          Задайте NEXT_PUBLIC_YANDEX_MAPS_API_KEY в cms/.env
        </div>
      ) : initError ? (
        <div className="map-preview map-preview--loading overlay-editor-map">{initError}</div>
      ) : (
        <div ref={containerRef} className="map-preview overlay-editor-map admin-yandex-map" />
      )}

      {imageUrl ? (
        <form action={saveGeorefAction} className="overlay-controls">
          <input type="hidden" name="centerLat" value={state.centerLat} />
          <input type="hidden" name="centerLng" value={state.centerLng} />
          <input type="hidden" name="widthMeters" value={state.widthMeters} />
          <input type="hidden" name="aspectRatio" value={state.aspectRatio} />
          <input type="hidden" name="rotation" value={state.rotation} />
          <input type="hidden" name="opacity" value={state.opacity} />

          <div className="overlay-fine-control overlay-nudge">
            <span className="overlay-fine-label">Сдвиг схемы</span>
            <div className="overlay-nudge-grid">
              <span />
              <button
                type="button"
                className="btn-mini"
                onClick={() => patchState(nudgeCenter(state.centerLat, state.centerLng, 1, 0))}
              >
                ↑ 1м
              </button>
              <button
                type="button"
                className="btn-mini"
                onClick={() => patchState(nudgeCenter(state.centerLat, state.centerLng, 5, 0))}
              >
                ↑ 5м
              </button>
              <button
                type="button"
                className="btn-mini"
                onClick={() => patchState(nudgeCenter(state.centerLat, state.centerLng, 0, -1))}
              >
                ← 1м
              </button>
              <span className="overlay-nudge-center">или перетащите маркер</span>
              <button
                type="button"
                className="btn-mini"
                onClick={() => patchState(nudgeCenter(state.centerLat, state.centerLng, 0, 1))}
              >
                1м →
              </button>
              <button
                type="button"
                className="btn-mini"
                onClick={() => patchState(nudgeCenter(state.centerLat, state.centerLng, -1, 0))}
              >
                ↓ 1м
              </button>
              <button
                type="button"
                className="btn-mini"
                onClick={() => patchState(nudgeCenter(state.centerLat, state.centerLng, -5, 0))}
              >
                ↓ 5м
              </button>
            </div>
          </div>

          <FineControl
            label="Масштаб (ширина)"
            value={state.widthMeters}
            min={50}
            max={2500}
            step={1}
            unit=" м"
            display={`${Math.round(state.widthMeters)} м`}
            onChange={(widthMeters) => patchState({ widthMeters })}
            nudge={[
              { label: '−10', delta: -10 },
              { label: '−1', delta: -1 },
              { label: '+1', delta: 1 },
              { label: '+10', delta: 10 },
            ]}
          />

          <FineControl
            label="Поворот"
            value={state.rotation}
            min={-180}
            max={180}
            step={0.1}
            unit="°"
            display={`${state.rotation.toFixed(1)}°`}
            onChange={(rotation) => patchState({ rotation })}
            nudge={[
              { label: '−1°', delta: -1 },
              { label: '−0.1°', delta: -0.1 },
              { label: '+0.1°', delta: 0.1 },
              { label: '+1°', delta: 1 },
            ]}
          />

          <FineControl
            label="Пропорции (высота/ширина)"
            value={state.aspectRatio}
            min={0.2}
            max={2}
            step={0.001}
            unit=""
            display={state.aspectRatio.toFixed(3)}
            onChange={(aspectRatio) => patchState({ aspectRatio })}
            nudge={[
              { label: '−0.01', delta: -0.01 },
              { label: '−0.001', delta: -0.001 },
              { label: '+0.001', delta: 0.001 },
              { label: '+0.01', delta: 0.01 },
            ]}
          />

          <FineControl
            label="Прозрачность"
            value={state.opacity}
            min={0.05}
            max={1}
            step={0.01}
            unit=""
            display={`${Math.round(state.opacity * 100)}%`}
            onChange={(opacity) => patchState({ opacity })}
          />

          <div className="overlay-coords hint">
            Центр: {state.centerLat.toFixed(6)}, {state.centerLng.toFixed(6)} · Поворот:{' '}
            {state.rotation.toFixed(1)}° · Ширина: {Math.round(state.widthMeters)} м
          </div>

          <button type="submit" className="btn-primary">
            Сохранить привязку
          </button>
        <ContentRevision />
</form>
      ) : (
        <p className="hint">Схема ещё не загружена. Выберите PNG/JPEG файл.</p>
      )}
    </div>
  );
}
