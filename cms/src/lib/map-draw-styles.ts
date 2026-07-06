import type { MapPathProperties, MapZoneProperties, MapZoneType } from '@/types';

export type DrawTool = 'select' | 'rect' | 'polygon' | 'line' | 'point';

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
  const presets: Record<MapZoneType, Omit<MapZoneProperties, 'id' | 'name' | 'zoneType'>> = {
    building: {
      fillColor: '#3a3a3c',
      fillOpacity: 0.88,
      strokeColor: '#5a5a5e',
      strokeWidth: 1,
      extrusionHeight: 4,
    },
    camping: {
      fillColor: '#5DA849',
      fillOpacity: 0.5,
      strokeColor: '#4a8639',
      strokeWidth: 1,
      extrusionHeight: 2,
    },
    parking: {
      fillColor: '#C4A86C',
      fillOpacity: 0.55,
      strokeColor: '#9a8454',
      strokeWidth: 1,
      extrusionHeight: 0,
    },
    autocamp: {
      fillColor: '#F5D547',
      fillOpacity: 0.6,
      strokeColor: '#c4a838',
      strokeWidth: 1,
      extrusionHeight: 1.5,
    },
    comfort: {
      fillColor: '#E8913A',
      fillOpacity: 0.55,
      strokeColor: '#b8722e',
      strokeWidth: 1,
      extrusionHeight: 3,
    },
    trade: {
      fillColor: '#D4B896',
      fillOpacity: 0.6,
      strokeColor: '#a89278',
      strokeWidth: 1,
      extrusionHeight: 3,
    },
    stage_area: {
      fillColor: '#8E8E93',
      fillOpacity: 0.65,
      strokeColor: '#636366',
      strokeWidth: 2,
      extrusionHeight: 10,
    },
    service: {
      fillColor: '#AEAEB2',
      fillOpacity: 0.45,
      strokeColor: '#8e8e93',
      strokeWidth: 1,
      extrusionHeight: 1,
    },
    toilet: {
      fillColor: '#5AC8FA',
      fillOpacity: 0.55,
      strokeColor: '#32ADE6',
      strokeWidth: 1,
      extrusionHeight: 2.5,
    },
    shower: {
      fillColor: '#64D2FF',
      fillOpacity: 0.55,
      strokeColor: '#0EBCF3',
      strokeWidth: 1,
      extrusionHeight: 2.5,
    },
    water: {
      fillColor: '#007AFF',
      fillOpacity: 0.5,
      strokeColor: '#0055CC',
      strokeWidth: 1,
      extrusionHeight: 1,
    },
    fence: {
      fillColor: '#FF3B30',
      fillOpacity: 0.08,
      strokeColor: '#FF3B30',
      strokeWidth: 2,
      extrusionHeight: 0,
    },
    custom: {
      fillColor: '#AEAEB2',
      fillOpacity: 0.4,
      strokeColor: '#8e8e93',
      strokeWidth: 1,
      extrusionHeight: 1,
    },
  };

  return { id, name, zoneType, ...presets[zoneType] };
}

function hexWithAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function strokeLine(width: number, color: string, dash?: number[]) {
  return dash ? { width, color, dash } : { width, color };
}

export function zoneFeatureStyle(props: MapZoneProperties) {
  const dash = props.zoneType === 'fence' ? [4, 4] : undefined;
  return {
    fill: hexWithAlpha(props.fillColor, props.fillOpacity),
    stroke: [strokeLine(props.strokeWidth ?? 1, props.strokeColor ?? '#ffffff', dash)],
    simplificationRate: 0,
  };
}

export function pathFeatureStyle(props: MapPathProperties) {
  const kind = props.pathKind ?? 'road';
  const styles: Record<PathKind, { color: string; width: number; dash?: number[] }> = {
    road: { color: '#5a5a5e', width: 6 },
    walkway: { color: '#8e8e93', width: 3, dash: [2, 3] },
    fence: { color: '#FF3B30', width: 2, dash: [4, 4] },
  };
  const s = styles[kind];
  return {
    stroke: [strokeLine(s.width, s.color, s.dash)],
    simplificationRate: 0,
  };
}
