import type { MapPathProperties, MapZoneProperties } from '../../types/map';

function hexWithAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Yandex Maps throws if stroke.dash is present but not iterable — omit when solid. */
function strokeLine(width: number, color: string, dash?: number[]) {
  return dash ? { width, color, dash } : { width, color };
}

export function zoneFeatureStyle(props: MapZoneProperties, selected = false) {
  const dash = props.zoneType === 'fence' ? [4, 4] : undefined;
  const strokeWidth = selected ? Math.max(props.strokeWidth ?? 1, 3) : (props.strokeWidth ?? 1);
  const strokeColor = selected ? '#FFC107' : (props.strokeColor ?? '#ffffff');
  return {
    fill: hexWithAlpha(props.fillColor, selected ? Math.min(props.fillOpacity + 0.15, 0.95) : props.fillOpacity),
    stroke: [strokeLine(strokeWidth, strokeColor, dash)],
    simplificationRate: 0,
  };
}

export function pathFeatureStyle(props: MapPathProperties) {
  const kind = props.pathKind ?? 'road';
  const styles: Record<
    NonNullable<MapPathProperties['pathKind']>,
    { color: string; width: number; dash?: number[] }
  > = {
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
