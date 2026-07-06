'use client';

import { useCallback, useRef, useState } from 'react';
import type { MapPathsGeoJson, MapPoisGeoJson, MapZonesGeoJson } from '@/types';

export type MapLayersState = {
  zones: MapZonesGeoJson;
  paths: MapPathsGeoJson;
  pois: MapPoisGeoJson;
};

const MAX_HISTORY = 40;

function cloneState(state: MapLayersState): MapLayersState {
  return {
    zones: JSON.parse(JSON.stringify(state.zones)) as MapZonesGeoJson,
    paths: JSON.parse(JSON.stringify(state.paths)) as MapPathsGeoJson,
    pois: JSON.parse(JSON.stringify(state.pois)) as MapPoisGeoJson,
  };
}

export function useMapEditorHistory(initial: MapLayersState) {
  const pastRef = useRef<MapLayersState[]>([]);
  const futureRef = useRef<MapLayersState[]>([]);
  const currentRef = useRef<MapLayersState>(cloneState(initial));

  const [zones, setZones] = useState(initial.zones);
  const [paths, setPaths] = useState(initial.paths);
  const [pois, setPois] = useState(initial.pois);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncFlags = useCallback(() => {
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  const applyState = useCallback(
    (next: MapLayersState) => {
      currentRef.current = cloneState(next);
      setZones(next.zones);
      setPaths(next.paths);
      setPois(next.pois);
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
    pois,
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
    setPois: (updater: MapPoisGeoJson | ((prev: MapPoisGeoJson) => MapPoisGeoJson)) =>
      setLayers((prev) => ({
        ...prev,
        pois: typeof updater === 'function' ? updater(prev.pois) : updater,
      })),
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
