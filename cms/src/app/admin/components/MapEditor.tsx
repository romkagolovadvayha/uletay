import { ContentRevision } from './ContentRevision';
import { LazyMapPanel } from './LazyMapPanel';
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
import type { AppData, FestivalMapConfig, MapPathsGeoJson, MapPoisGeoJson, MapZonesGeoJson } from '@/types';

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
const emptyPois: MapPoisGeoJson = { type: 'FeatureCollection', features: [] };

export function MapEditor({ data }: Props) {
  const config = data.festivalMap ?? emptyConfig;
  const zones = data.mapZones ?? emptyZones;
  const paths = data.mapPaths ?? emptyPaths;
  const pois = data.mapPois ?? emptyPois;

  const bounds = config.territoryBounds;

  return (
    <>
      <nav className="map-section-tabs" aria-label="Разделы редактора карты">
        <a href="#map-objects">Редактор карты</a>
        <a href="#map-navigation">Проверка маршрутов</a>
        <a href="#map-settings">Настройки</a>
        <a href="/map" target="_blank" rel="noreferrer">
          Открыть карту ↗
        </a>
      </nav>
      <section id="map-objects" className="map-editor-section">
        <MapDrawEditor
          config={config}
          zones={zones}
          paths={paths}
          pois={pois}
          overlay={config.adminOverlay}
          saveAction={saveMapLayersAction}
        />
      </section>
      <LazyMapPanel>
        <MapOverlayEditor
          config={config}
          zones={zones}
          paths={paths}
          overlay={config.adminOverlay}
          uploadAction={uploadMapSchemeAction}
          saveGeorefAction={saveMapOverlayGeorefAction}
          removeOverlayAction={removeMapSchemeAction}
        />
      </LazyMapPanel>
      <details id="map-settings" className="advanced-panel map-editor-section">
        <summary>Настройки отображения карты</summary>
        <form action={saveMapConfigAction} className="panel">
          <ContentRevision />
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
              Масштаб при открытии
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
              Юго-запад — широта
              <input name="swLat" type="number" step="0.000001" defaultValue={bounds?.sw.lat ?? ''} />
            </label>
            <label>
              Юго-запад — долгота
              <input name="swLng" type="number" step="0.000001" defaultValue={bounds?.sw.lng ?? ''} />
            </label>
            <label>
              Северо-восток — широта
              <input name="neLat" type="number" step="0.000001" defaultValue={bounds?.ne.lat ?? ''} />
            </label>
            <label>
              Северо-восток — долгота
              <input name="neLng" type="number" step="0.000001" defaultValue={bounds?.ne.lng ?? ''} />
            </label>
          </div>
          <button type="submit" className="btn-primary">
            Сохранить настройки
          </button>
        </form>
      </details>
      <details className="advanced-panel">
        <summary>GeoJSON (расширенный режим)</summary>
        <form action={saveMapGeoJsonAction} className="panel-inner">
          <ContentRevision />
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
          <label className="full">
            Точки (Point)
            <textarea name="mapPois" rows={8} defaultValue={JSON.stringify(pois, null, 2)} />
          </label>
          <button type="submit" className="btn-secondary">
            Сохранить GeoJSON
          </button>
        </form>
      </details>
    </>
  );
}
