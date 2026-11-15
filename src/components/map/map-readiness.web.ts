import type { Map as WebMap } from 'maplibre-gl';

// The visitor plan is usable before optional images, labels and remote tiles finish.
export function watchFestivalMapReady(map: Pick<WebMap, 'on' | 'off' | 'getSource' | 'isSourceLoaded'>, ready: () => void) {
  let rendered = false;
  const onRender = () => {
    if (rendered || !['zones', 'paths'].every(id => map.getSource(id) && map.isSourceLoaded(id))) return;
    rendered = true;
    ready();
  };
  map.on('render', onRender);
  return () => map.off('render', onRender);
}
