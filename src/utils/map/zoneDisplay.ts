import type { MapZoneProperties } from '../../types/map';
import { ZONE_TYPE_LABELS } from './layerStyles';

const LABELED_ZONE_TYPES = new Set<MapZoneProperties['zoneType']>([
  'building',
  'toilet',
  'shower',
  'water',
  'service',
  'comfort',
  'trade',
  'stage_area',
  'custom',
]);

export function zoneLabelText(props: MapZoneProperties): string {
  const trimmed = props.name?.trim();
  if (trimmed) return trimmed;
  return ZONE_TYPE_LABELS[props.zoneType] ?? 'Зона';
}

export function shouldShowZoneLabel(props: MapZoneProperties): boolean {
  if (props.showLabel === false) return false;
  if (props.showLabel === true) return true;
  return LABELED_ZONE_TYPES.has(props.zoneType);
}
