'use client';

import { ContentRevision } from './ContentRevision';
import { useCallback, useMemo, useState } from 'react';
import { AdminMapCanvas, type MapHandle } from './AdminMapCanvas';
import type { FestivalMapConfig, MapAdminOverlay, MapPathsGeoJson, MapZonesGeoJson } from '@/types';

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
      <label className="overlay-fine-label" htmlFor={`overlay-${label}`}>
        {label}
      </label>
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
          id={`overlay-${label}`}
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
        aria-label={`${label}: ползунок`}
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
  const [showVectors, setShowVectors] = useState(true);
  const [state, setState] = useState(() => buildInitialState(config, overlay));

  const patchState = useCallback((patch: Partial<GeorefState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const imageUrl = overlay?.imageUrl;
  const previewOverlay = useMemo(
    () =>
      imageUrl
        ? {
            imageUrl,
            center: { lat: state.centerLat, lng: state.centerLng },
            widthMeters: state.widthMeters,
            aspectRatio: state.aspectRatio,
            rotation: state.rotation,
            opacity: state.opacity,
          }
        : undefined,
    [imageUrl, state],
  );
  const handles = useMemo<MapHandle[]>(
    () =>
      imageUrl
        ? [
            {
              id: 'overlay-center',
              coordinate: [state.centerLng, state.centerLat],
              title: 'Перетащить схему',
              onCommit: (c) => patchState({ centerLng: c[0], centerLat: c[1] }),
            },
          ]
        : [],
    [imageUrl, state.centerLng, state.centerLat, patchState],
  );

  return (
    <div className="panel overlay-editor">
      <h2>PNG-схема на карте</h2>
      <p className="hint">
        Перетащите жёлтый маркер на карте. Для точной подгонки используйте числовые поля и кнопки ± — шаг
        поворота 0.1°, сдвига 1 м.
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

      <AdminMapCanvas
        config={config}
        zones={showVectors ? zones : undefined}
        paths={showVectors ? paths : undefined}
        overlay={previewOverlay}
        handles={handles}
        className="overlay-editor-map"
      />

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
