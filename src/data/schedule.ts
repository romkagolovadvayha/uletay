import { Stage, SchedulePerformance } from '../types';
import { stageColors } from '../theme/palettes';

/** Minimal festival stub until API loads. No offline schedule seed. */
export const festivalInfo = {
  name: 'УЛЕТАЙ',
  year: 2026,
  startDate: '2026-07-08',
  endDate: '2026-07-12',
  location: 'Лагуново, Удмуртия',
  locationShort: 'Удмуртия, с. Лагуново',
  ageRating: '6+',
};

export const stages: Stage[] = [
  { id: 'ren-tv', name: 'СЦЕНА РЕН ТВ', shortName: 'РЕН ТВ', color: stageColors['ren-tv'] },
  { id: 'south', name: 'ЮЖНАЯ СЦЕНА', shortName: 'Южная', color: stageColors.south },
  { id: 'west', name: 'ЗАПАДНАЯ СЦЕНА', shortName: 'Западная', color: stageColors.west },
];

export const schedulePerformances: SchedulePerformance[] = [];
