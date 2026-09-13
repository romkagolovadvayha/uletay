'use client';

import { useCallback, useRef, useState } from 'react';
import type { MapPathsGeoJson, MapPoisGeoJson, MapZonesGeoJson } from '@/types';

export type MapLayersState = {
  zones: MapZonesGeoJson;
  paths: MapPathsGeoJson;
  pois: MapPoisGeoJson;
};

const EMPTY_ZONES: MapZonesGeoJson = { type: 'FeatureCollection', features: [] };
const EMPTY_PATHS: MapPathsGeoJson = { type: 'FeatureCollection', features: [] };

const EMPTY_POIS: MapPoisGeoJson = { type: 'FeatureCollection', features: [] };

// Immutable snapshots share unchanged features instead of cloning hundreds of polygons per keystroke.
const MAX_HISTORY = 40;

function isFeatureCollection(value: unknown): value is MapZonesGeoJson | MapPathsGeoJson | MapPoisGeoJson {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: string }).type === 'FeatureCollection' &&
    Array.isArray((value as { features?: unknown }).features)
  );
}

export function normalizeMapLayersState(state: Partial<MapLayersState> | null | undefined): MapLayersState {
  return {
    pois: isFeatureCollection(state?.pois) ? (state.pois as MapPoisGeoJson) : EMPTY_POIS,
    zones: isFeatureCollection(state?.zones) ? (state.zones as MapZonesGeoJson) : EMPTY_ZONES,
    paths: isFeatureCollection(state?.paths) ? (state.paths as MapPathsGeoJson) : EMPTY_PATHS,
  };
}

export function useMapEditorHistory(initial: MapLayersState) {
  const normalizedInitial = normalizeMapLayersState(initial);
  const pastRef = useRef<MapLayersState[]>([]);
  const futureRef = useRef<MapLayersState[]>([]);
  const currentRef = useRef<MapLayersState>(normalizedInitial);

  const [zones, setZones] = useState(normalizedInitial.zones);
  const [pois, setPois] = useState(normalizedInitial.pois ?? EMPTY_POIS);
  const [paths, setPaths] = useState(normalizedInitial.paths);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncFlags = useCallback(() => {
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  const applyState = useCallback(
    (next: MapLayersState) => {
      const normalized = normalizeMapLayersState(next);
      currentRef.current = normalized;
      setZones(normalized.zones);
      setPaths(normalized.paths);
      setPois(normalized.pois ?? EMPTY_POIS);
      syncFlags();
    },
    [syncFlags],
  );

  const commit = useCallback(
    (next: MapLayersState) => {
      pastRef.current = [...pastRef.current.slice(-MAX_HISTORY + 1), currentRef.current];
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
    futureRef.current = [currentRef.current, ...futureRef.current];
    const prev = past[past.length - 1];
    pastRef.current = past.slice(0, -1);
    applyState(prev);
  }, [applyState]);

  const redo = useCallback(() => {
    const future = futureRef.current;
    if (future.length === 0) return;
    pastRef.current = [...pastRef.current, currentRef.current];
    const next = future[0];
    futureRef.current = future.slice(1);
    applyState(next);
  }, [applyState]);

  const updateZones = useCallback(
    (updater: MapZonesGeoJson | ((prev: MapZonesGeoJson) => MapZonesGeoJson)) =>
      setLayers((prev) => ({
        ...prev,
        zones: typeof updater === 'function' ? updater(prev.zones) : updater,
      })),
    [setLayers],
  );
  const updatePaths = useCallback(
    (updater: MapPathsGeoJson | ((prev: MapPathsGeoJson) => MapPathsGeoJson)) =>
      setLayers((prev) => ({
        ...prev,
        paths: typeof updater === 'function' ? updater(prev.paths) : updater,
      })),
    [setLayers],
  );
  const updatePois = useCallback(
    (updater: MapPoisGeoJson | ((prev: MapPoisGeoJson) => MapPoisGeoJson)) =>
      setLayers((prev) => ({
        ...prev,
        pois: typeof updater === 'function' ? updater(prev.pois ?? EMPTY_POIS) : updater,
      })),
    [setLayers],
  );
  return {
    zones,
    paths,
    pois,
    setZones: updateZones,
    setPaths: updatePaths,
    setPois: updatePois,
    setLayers,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
