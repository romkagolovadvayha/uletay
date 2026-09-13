import type { MapPathProperties, MapZoneProperties, MapZoneType } from '@/types';

export type DrawTool = 'select' | 'rect' | 'polygon' | 'line' | 'poi';

export type PathKind = NonNullable<MapPathProperties['pathKind']>;

export const ZONE_TYPE_LABELS: Record<MapZoneType, string> = {
  building: 'Здание / объект',
  camping: 'Кемпинг',
  parking: 'Парковка',
  autocamp: 'Автокемпинг',
  comfort: 'Комфорт',
  trade: 'Торговля',
  stage_area: 'Сцена (площадка)',
  service: 'Сервис',
  toilet: 'Туалет',
  shower: 'Душ',
  water: 'Вода',
  fence: 'Ограждение',
  custom: 'Другое',
};

export const PATH_KIND_LABELS: Record<PathKind, string> = {
  road: 'Дорога / улица',
  walkway: 'Тропинка',
  fence: 'Линия забора',
};

export function defaultZoneProps(zoneType: MapZoneType, name: string, id: string): MapZoneProperties {
  const colors: Record<MapZoneType, string> = {
    building: '#C8CDC5',
    camping: '#8DA837',
    parking: '#8DA837',
    autocamp: '#F5D547',
    comfort: '#8DA837',
    trade: '#F2F0DF',
    stage_area: '#FFD530',
    service: '#F5F2E5',
    toilet: '#F5F2E5',
    shower: '#E76055',
    water: '#55BFDB',
    fence: '#CD3F32',
    custom: '#C8CDC5',
  };
  return {
    id,
    name,
    zoneType,
    fillColor: colors[zoneType],
    fillOpacity: zoneType === 'fence' ? 0.08 : 0.95,
    strokeColor: colors[zoneType],
    strokeWidth: 1,
  };
}
