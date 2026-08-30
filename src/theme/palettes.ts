import type { StageId } from '../types';

/* ds-allow-hardcode:start -- Central data-visualization palette definitions. */
export const stageColors: Record<StageId, string> = {
  south: '#F5C518',
  west: '#34C759',
  'ren-tv': '#FF5520',
};

export const headlinerImageTints = [
  '#4A1C1C',
  '#3D2E14',
  '#1E3A4A',
  '#2A1F3D',
  '#1A1A1A',
  '#3A1414',
  '#243024',
  '#3A3018',
  '#2E2438',
  '#1F2D3A',
] as const;
/* ds-allow-hardcode:end */
