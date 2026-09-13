import type { MapZoneProperties } from '../../types/map';

/** Schematic heights in metres; compact enough to keep surrounding paths visible. */
export function buildingHeight(properties: MapZoneProperties): number {
  if (properties.parentZoneId || properties.zoneType === 'fence') return 0;
  if (properties.zoneType === 'stage_area') return 6;
  if (['toilet', 'shower'].includes(properties.zoneType)) return 2.6;
  if (properties.zoneType === 'water') return 1.5;
  if (['trade', 'building', 'service'].includes(properties.zoneType)) return /кпп/i.test(properties.name) ? 3.2 : 3;
  if (properties.zoneType === 'comfort' && /гостиниц/i.test(properties.name)) return 2.5;
  return 0;
}
