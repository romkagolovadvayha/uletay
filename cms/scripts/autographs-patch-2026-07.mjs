/**
 * Дельта автограф-сессий по афише YLETAY 2026 (июль 2026).
 * Удаляет устаревшие записи с неверным временем/датой и добавляет/обновляет исправленные.
 */
export const replacements = [
  {
    from: { stageId: 'south', date: '2026-07-11', artist: 'КЭЖУАЛ / CASUAL', startTime: '16:30' },
    to: { stageId: 'south', date: '2026-07-11', startTime: '17:30', artist: 'КЭЖУАЛ / CASUAL' },
  },
  {
    from: { stageId: 'south', date: '2026-07-11', artist: 'КАТЮША', startTime: '17:30' },
    to: { stageId: 'south', date: '2026-07-11', startTime: '17:00', artist: 'КАТЮША' },
  },
  {
    from: { stageId: 'west', date: '2026-07-11', artist: 'ДЖОКОНДА', startTime: '15:20' },
    to: { stageId: 'west', date: '2026-07-11', startTime: '23:00', artist: 'ДЖОКОНДА' },
  },
  {
    from: { stageId: 'west', date: '2026-07-12', artist: 'RAVANNA', startTime: '01:30' },
    to: { stageId: 'west', date: '2026-07-10', startTime: '01:30', artist: 'RAVANNA' },
  },
  {
    from: { stageId: 'west', date: '2026-07-12', artist: 'РАВАННА / RAVANNA', startTime: '01:30' },
    to: { stageId: 'west', date: '2026-07-10', startTime: '01:30', artist: 'RAVANNA' },
  },
];

export const removals = replacements.map((item) => item.from);

/** Ключи сессий из cms/seed/content.json, которые нужно добавить или обновить */
export const upsertKeys = [
  { stageId: 'south', date: '2026-07-08', startTime: '19:00', artist: 'ГРУППА Ё' },
  { stageId: 'west', date: '2026-07-09', startTime: '22:00', artist: 'ОТМОРОЗКИ' },
  { stageId: 'west', date: '2026-07-10', startTime: '01:30', artist: 'RAVANNA' },
  { stageId: 'south', date: '2026-07-11', startTime: '17:00', artist: 'КАТЮША' },
  { stageId: 'south', date: '2026-07-11', startTime: '17:30', artist: 'КЭЖУАЛ / CASUAL' },
  { stageId: 'west', date: '2026-07-11', startTime: '21:30', artist: 'БАХЫТ-КОМПОТ' },
  { stageId: 'west', date: '2026-07-11', startTime: '23:00', artist: 'ДЖОКОНДА' },
];
