import type { GeoJSONSource, LayerSpecification, Map as WebMap } from 'maplibre-gl';
import type { SceneData, SceneImage, SceneSource } from './map-scene';

export type AppliedScene = { sources: Map<string, SceneData>; images: Map<string, string> };
export function syncWebMapScene(map: WebMap, scene: { sources: SceneSource[]; images: SceneImage[] }, applied: AppliedScene) {
  for (const source of scene.sources) {
    if (!map.getSource(source.id)) map.addSource(source.id, { type: 'geojson', data: source.data, tolerance: 0 });
    else if (applied.sources.get(source.id) !== source.data) (map.getSource(source.id) as GeoJSONSource).setData(source.data);
    applied.sources.set(source.id, source.data);
    // Native pins style-spec 26.2; GL JS uses 26.4. The shared subset is validated
    // against both installed specs by test:map:renderer.
    for (const layer of source.layers) if (!map.getLayer(layer.id)) map.addLayer(layer as LayerSpecification);
  }
  const desired = new Set(scene.images.map(image => image.id));
  for (const id of applied.images.keys()) {
    if (desired.has(id)) continue;
    if (map.getLayer(`${id}-raster`)) map.removeLayer(`${id}-raster`);
    if (map.getSource(id)) map.removeSource(id);
    applied.images.delete(id);
  }
  for (const image of scene.images) {
    const signature = JSON.stringify(image);
    if (applied.images.get(image.id) === signature) continue;
    if (map.getLayer(`${image.id}-raster`)) map.removeLayer(`${image.id}-raster`);
    if (map.getSource(image.id)) map.removeSource(image.id);
    map.addSource(image.id, { type: 'image', url: image.url, coordinates: image.coordinates });
    map.addLayer({ id: `${image.id}-raster`, type: 'raster', source: image.id,
      paint: { 'raster-opacity': image.opacity, 'raster-fade-duration': 0 } }, image.id === 'festival-plan' ? 'fest-zone-fill' : 'fest-rows');
    applied.images.set(image.id, signature);
  }
}
