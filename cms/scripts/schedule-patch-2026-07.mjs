/**
 * Дельта расписания выступлений по афише YLETAY 2026 (июль 2026).
 */
export const replacements = [
  {
    from: { stageId: 'south', date: '2026-07-11', artist: 'КЭЖУАЛ / CASUAL', startTime: '15:00' },
    to: { stageId: 'south', date: '2026-07-11', startTime: '16:00', artist: 'КЭЖУАЛ / CASUAL' },
  },
  {
    from: { stageId: 'south', date: '2026-07-11', artist: 'КАТЮША', startTime: '16:00' },
    to: { stageId: 'south', date: '2026-07-11', startTime: '15:00', artist: 'КАТЮША' },
  },
  {
    from: { stageId: 'west', date: '2026-07-10', artist: 'NEARINAMENYA', startTime: '14:00' },
    to: { stageId: 'west', date: '2026-07-10', startTime: '14:00', artist: 'НИКОЛАЙ ГРИНЬКО' },
  },
];

export const extraRemovals = [
  { stageId: 'west', date: '2026-07-11', artist: 'КИТЧ', startTime: '13:30' },
];

export const removals = [...replacements.map((item) => item.from), ...extraRemovals];

export const upsertKeys = [
  { stageId: 'south', date: '2026-07-11', startTime: '15:00', artist: 'КАТЮША' },
  { stageId: 'south', date: '2026-07-11', startTime: '16:00', artist: 'КЭЖУАЛ / CASUAL' },
  { stageId: 'west', date: '2026-07-10', startTime: '14:00', artist: 'НИКОЛАЙ ГРИНЬКО' },
];
