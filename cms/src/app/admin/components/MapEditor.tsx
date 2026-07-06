import Link from 'next/link';
import {
  deleteMapPoiAction,
  removeMapSchemeAction,
  saveMapConfigAction,
  saveMapGeoJsonAction,
  saveMapLayersAction,
  saveMapOverlayGeorefAction,
  uploadMapSchemeAction,
  upsertMapPoiAction,
} from '../actions';
import { DeleteButton } from './DeleteButton';
import { MapDrawEditor } from './MapDrawEditor';
import { MapOverlayEditor } from './MapOverlayEditor';
import type {
  AppData,
  FestivalMapConfig,
  MapPathsGeoJson,
  MapPoisGeoJson,
  MapPoiCategory,
  MapZonesGeoJson,
} from '@/types';

const POI_CATEGORIES: { value: MapPoiCategory; label: string }[] = [
  { value: 'stage', label: 'Сцена' },
  { value: 'foodcourt', label: 'Фудкорт' },
  { value: 'toilet', label: 'Туалеты' },
  { value: 'shower', label: 'Душ' },
  { value: 'water', label: 'Вода' },
  { value: 'medical', label: 'Медпункт' },
  { value: 'info', label: 'Инфо' },
  { value: 'entrance', label: 'Въезд' },
  { value: 'parking', label: 'Парковка' },
  { value: 'custom', label: 'Другое' },
];

type Props = {
  data: AppData;
  editPoiId?: string;
};

const emptyConfig: FestivalMapConfig = {
  center: { lat: 56.606975, lng: 53.622461 },
  defaultZoom: 14,
  enabled: true,
};

const emptyZones: MapZonesGeoJson = { type: 'FeatureCollection', features: [] };
const emptyPaths: MapPathsGeoJson = { type: 'FeatureCollection', features: [] };
const emptyPois: MapPoisGeoJson = { type: 'FeatureCollection', features: [] };

export function MapEditor({ data, editPoiId }: Props) {
  const config = data.festivalMap ?? emptyConfig;
  const zones = data.mapZones ?? emptyZones;
  const paths = data.mapPaths ?? emptyPaths;
  const pois = data.mapPois ?? emptyPois;

  const isNewPoi = editPoiId === 'new';
  const editingPoi = isNewPoi
    ? null
    : editPoiId
      ? pois.features.find((f) => f.properties.id === editPoiId) ?? null
      : null;

  const bounds = config.territoryBounds;

  return (
    <>
      <div className="toolbar">
        <Link className="btn-primary" href="/admin?tab=map&editPoi=new">
          + Добавить POI
        </Link>
      </div>

      <MapOverlayEditor
        config={config}
        zones={zones}
        paths={paths}
        pois={pois}
        overlay={config.adminOverlay}
        uploadAction={uploadMapSchemeAction}
        saveGeorefAction={saveMapOverlayGeorefAction}
        removeOverlayAction={removeMapSchemeAction}
      />

      <MapDrawEditor
        config={config}
        zones={zones}
        paths={paths}
        pois={pois}
        overlay={config.adminOverlay}
        editPoiId={editPoiId}
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

      {editPoiId ? (
        <form id="poi-edit-panel" action={upsertMapPoiAction} className="panel">
          <h2>{isNewPoi ? 'Новый POI' : 'Редактирование POI'}</h2>
          <input type="hidden" name="isNew" value={isNewPoi ? '1' : '0'} />
          <input type="hidden" name="id" value={editingPoi?.properties.id ?? ''} />
          <div className="grid">
            <label>
              ID
              <input name="poiId" defaultValue={editingPoi?.properties.id ?? ''} readOnly={!isNewPoi} />
            </label>
            <label>
              Название
              <input name="name" defaultValue={editingPoi?.properties.name ?? ''} required />
            </label>
            <label>
              Категория
              <select name="category" defaultValue={editingPoi?.properties.category ?? 'custom'}>
                {POI_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Долгота
              <input
                name="lng"
                type="number"
                step="0.000001"
                defaultValue={editingPoi?.geometry.coordinates[0] ?? config.center.lng}
                required
              />
            </label>
            <label>
              Широта
              <input
                name="lat"
                type="number"
                step="0.000001"
                defaultValue={editingPoi?.geometry.coordinates[1] ?? config.center.lat}
                required
              />
            </label>
            <label className="full">
              Описание
              <input name="description" defaultValue={editingPoi?.properties.description ?? ''} />
            </label>
            <label>
              Связь — тип
              <select name="linkType" defaultValue={editingPoi?.properties.link?.type ?? 'none'}>
                <option value="none">Нет</option>
                <option value="stage">Сцена</option>
                <option value="foodcourt">Фудкорт</option>
              </select>
            </label>
            <label>
              Связь — ID
              <input name="linkId" defaultValue={editingPoi?.properties.link?.id ?? ''} />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              Сохранить POI
            </button>
            <Link href="/admin?tab=map">Отмена</Link>
          </div>
        </form>
      ) : null}

      <div className="panel">
        <h2>Точки интереса</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Категория</th>
              <th>Координаты</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pois.features.map((feature) => (
              <tr key={feature.properties.id}>
                <td>{feature.properties.name}</td>
                <td>{feature.properties.category}</td>
                <td>
                  {feature.geometry.coordinates[1].toFixed(5)},{' '}
                  {feature.geometry.coordinates[0].toFixed(5)}
                </td>
                <td className="actions">
                  <Link href={`/admin?tab=map&editPoi=${feature.properties.id}`}>Изменить</Link>
                  <DeleteButton action={deleteMapPoiAction} id={feature.properties.id} label="POI" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pois.features.length === 0 ? <p className="hint">POI ещё не добавлены</p> : null}
      </div>
    </>
  );
}
