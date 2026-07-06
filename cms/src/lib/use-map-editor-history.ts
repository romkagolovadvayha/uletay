'use client';

import { useCallback, useRef, useState } from 'react';
import type { MapPathsGeoJson, MapZonesGeoJson } from '@/types';

export type MapLayersState = {
  zones: MapZonesGeoJson;
  paths: MapPathsGeoJson;
};

const EMPTY_ZONES: MapZonesGeoJson = { type: 'FeatureCollection', features: [] };
const EMPTY_PATHS: MapPathsGeoJson = { type: 'FeatureCollection', features: [] };

const MAX_HISTORY = 40;

function isFeatureCollection(value: unknown): value is MapZonesGeoJson | MapPathsGeoJson {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: string }).type === 'FeatureCollection' &&
    Array.isArray((value as { features?: unknown }).features)
  );
}

export function normalizeMapLayersState(state: Partial<MapLayersState> | null | undefined): MapLayersState {
  return {
    zones: isFeatureCollection(state?.zones) ? state.zones : EMPTY_ZONES,
    paths: isFeatureCollection(state?.paths) ? state.paths : EMPTY_PATHS,
  };
}

function cloneGeoJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneState(state: MapLayersState): MapLayersState {
  const normalized = normalizeMapLayersState(state);
  return {
    zones: cloneGeoJson(normalized.zones),
    paths: cloneGeoJson(normalized.paths),
  };
}

export function useMapEditorHistory(initial: MapLayersState) {
  const normalizedInitial = normalizeMapLayersState(initial);
  const pastRef = useRef<MapLayersState[]>([]);
  const futureRef = useRef<MapLayersState[]>([]);
  const currentRef = useRef<MapLayersState>(cloneState(normalizedInitial));

  const [zones, setZones] = useState(normalizedInitial.zones);
  const [paths, setPaths] = useState(normalizedInitial.paths);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncFlags = useCallback(() => {
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  const applyState = useCallback(
    (next: MapLayersState) => {
      const normalized = cloneState(next);
      currentRef.current = normalized;
      setZones(normalized.zones);
      setPaths(normalized.paths);
      syncFlags();
    },
    [syncFlags],
  );

  const commit = useCallback(
    (next: MapLayersState) => {
      pastRef.current = [...pastRef.current.slice(-MAX_HISTORY + 1), cloneState(currentRef.current)];
      futureRef.current = [];
      applyState(next);
    },
    [applyState],
  );

  const setLayers = useCallback(
    (updater: (prev: MapLayersState) => MapLayersState) => {
      commit(updater(currentRef.current));
    },
    [commit],
  );

  const undo = useCallback(() => {
    const past = pastRef.current;
    if (past.length === 0) return;
    futureRef.current = [cloneState(currentRef.current), ...futureRef.current];
    const prev = past[past.length - 1];
    pastRef.current = past.slice(0, -1);
    applyState(prev);
  }, [applyState]);

  const redo = useCallback(() => {
    const future = futureRef.current;
    if (future.length === 0) return;
    pastRef.current = [...pastRef.current, cloneState(currentRef.current)];
    const next = future[0];
    futureRef.current = future.slice(1);
    applyState(next);
  }, [applyState]);

  return {
    zones,
    paths,
    setZones: (updater: MapZonesGeoJson | ((prev: MapZonesGeoJson) => MapZonesGeoJson)) =>
      setLayers((prev) => ({
        ...prev,
        zones: typeof updater === 'function' ? updater(prev.zones) : updater,
      })),
    setPaths: (updater: MapPathsGeoJson | ((prev: MapPathsGeoJson) => MapPathsGeoJson)) =>
      setLayers((prev) => ({
        ...prev,
        paths: typeof updater === 'function' ? updater(prev.paths) : updater,
      })),
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
