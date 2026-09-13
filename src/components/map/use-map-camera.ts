import { useEffect, useMemo, useRef } from 'react';
import type { FestivalMapApi, FestivalMapViewProps } from './types';

// Screen actions can arrive during map loading (search/deep links). Replay them
// once the platform camera is attached, including after a retry.
export function useMapCamera(onMapReady: FestivalMapViewProps['onMapReady']) {
  const target = useRef<FestivalMapApi | null>(null);
  const pending = useRef<((api: FestivalMapApi) => void)[]>([]);
  const api = useMemo<FestivalMapApi>(() => {
    const run = (command: (camera: FestivalMapApi) => void) => {
      if (target.current) command(target.current);
      else pending.current.push(command);
    };
    return { showFestival: () => run(camera => camera.showFestival?.()),
      zoomBy: delta => run(camera => camera.zoomBy?.(delta)),
      flyTo: (lat, lng, zoom) => run(camera => camera.flyTo(lat, lng, zoom)),
      fitRoute: coordinates => run(camera => camera.fitRoute(coordinates)) };
  }, []);
  useEffect(() => { onMapReady?.(api); }, [onMapReady, api]);
  return useMemo(() => (camera: FestivalMapApi | null) => {
    target.current = camera;
    if (camera) { const commands = pending.current; pending.current = []; commands.forEach(command => command(camera)); }
  }, []);
}
