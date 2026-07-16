import { Stage, SchedulePerformance } from '../types';

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
  { id: 'ren-tv', name: 'СЦЕНА РЕН ТВ', shortName: 'РЕН ТВ', color: '#FF5520' },
  { id: 'south', name: 'ЮЖНАЯ СЦЕНА', shortName: 'Южная', color: '#F5C518' },
  { id: 'west', name: 'ЗАПАДНАЯ СЦЕНА', shortName: 'Западная', color: '#34C759' },
];

export const schedulePerformances: SchedulePerformance[] = [];
