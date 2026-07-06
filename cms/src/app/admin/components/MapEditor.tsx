import {
  removeMapSchemeAction,
  saveMapConfigAction,
  saveMapGeoJsonAction,
  saveMapLayersAction,
  saveMapOverlayGeorefAction,
  uploadMapSchemeAction,
} from '../actions';
import { MapDrawEditor } from './MapDrawEditor';
import { MapOverlayEditor } from './MapOverlayEditor';
import type {
  AppData,
  FestivalMapConfig,
  MapPathsGeoJson,
  MapZonesGeoJson,
} from '@/types';

type Props = {
  data: AppData;
};

const emptyConfig: FestivalMapConfig = {
  center: { lat: 56.606975, lng: 53.622461 },
  defaultZoom: 14,
  enabled: true,
};

const emptyZones: MapZonesGeoJson = { type: 'FeatureCollection', features: [] };
const emptyPaths: MapPathsGeoJson = { type: 'FeatureCollection', features: [] };

export function MapEditor({ data }: Props) {
  const config = data.festivalMap ?? emptyConfig;
  const zones = data.mapZones ?? emptyZones;
  const paths = data.mapPaths ?? emptyPaths;

  const bounds = config.territoryBounds;

  return (
    <>
      <MapOverlayEditor
        config={config}
        zones={zones}
        paths={paths}
        overlay={config.adminOverlay}
        uploadAction={uploadMapSchemeAction}
        saveGeorefAction={saveMapOverlayGeorefAction}
        removeOverlayAction={removeMapSchemeAction}
      />

      <MapDrawEditor
        config={config}
        zones={zones}
        paths={paths}
        overlay={config.adminOverlay}
        saveAction={saveMapLayersAction}
      />

      <form action={saveMapConfigAction} className="panel">
        <h2>Настройки карты</h2>
        <div className="grid">
          <label>
            Включена
            <select name="enabled" defaultValue={config.enabled ? '1' : '0'}>
              <option value="1">Да</option>
              <option value="0">Нет</option>
            </select>
          </label>
          <label>
            Zoom по умолчанию
            <input name="defaultZoom" type="number" defaultValue={config.defaultZoom} min={1} max={20} />
          </label>
          <label>
            Центр — широта
            <input name="centerLat" type="number" step="0.000001" defaultValue={config.center.lat} />
          </label>
          <label>
            Центр — долгота
            <input name="centerLng" type="number" step="0.000001" defaultValue={config.center.lng} />
          </label>
          <label>
            Граница SW — lat
            <input name="swLat" type="number" step="0.000001" defaultValue={bounds?.sw.lat ?? ''} />
          </label>
          <label>
            Граница SW — lng
            <input name="swLng" type="number" step="0.000001" defaultValue={bounds?.sw.lng ?? ''} />
          </label>
          <label>
            Граница NE — lat
            <input name="neLat" type="number" step="0.000001" defaultValue={bounds?.ne.lat ?? ''} />
          </label>
          <label>
            Граница NE — lng
            <input name="neLng" type="number" step="0.000001" defaultValue={bounds?.ne.lng ?? ''} />
          </label>
        </div>
        <button type="submit" className="btn-primary">
          Сохранить настройки
        </button>
      </form>

      <details className="panel">
        <summary>GeoJSON (расширенный режим)</summary>
        <form action={saveMapGeoJsonAction} className="panel-inner">
          <p className="hint">
            Ручное редактирование FeatureCollection. Координаты: [lng, lat]. Предпочтительно — редактор выше.
          </p>
          <label className="full">
            Зоны (Polygon)
            <textarea name="mapZones" rows={8} defaultValue={JSON.stringify(zones, null, 2)} />
          </label>
          <label className="full">
            Дорожки (LineString)
            <textarea name="mapPaths" rows={8} defaultValue={JSON.stringify(paths, null, 2)} />
          </label>
          <button type="submit" className="btn-secondary">
            Сохранить GeoJSON
          </button>
        </form>
      </details>
    </>
  );
}
