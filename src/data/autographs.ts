import { AutographSession } from '../types';
import { buildHeadlinerId } from '../utils/headlinersCore';

type RawAutograph = {
  stageId: AutographSession['stageId'];
  date: string;
  startTime: string;
  endTime: string;
  artist: string;
};

const rawAutographs: RawAutograph[] = [
  // Южная сцена
  { stageId: 'south', date: '2026-07-08', startTime: '17:00', endTime: '17:30', artist: 'NADИ' },
  { stageId: 'south', date: '2026-07-08', startTime: '18:00', endTime: '18:30', artist: 'ВЕРЕ ДИКТУМ / VERE DICTUM' },
  { stageId: 'south', date: '2026-07-08', startTime: '19:00', endTime: '19:30', artist: 'ГРУППА Ё' },
  { stageId: 'south', date: '2026-07-08', startTime: '20:00', endTime: '20:30', artist: 'МОСКВИТИН' },
  { stageId: 'south', date: '2026-07-08', startTime: '20:30', endTime: '21:00', artist: 'ЛУЧШИЙ САМЫЙ ДЕНЬ' },
  { stageId: 'south', date: '2026-07-08', startTime: '22:00', endTime: '22:30', artist: 'КАЛЕВАЛА' },
  { stageId: 'south', date: '2026-07-08', startTime: '22:30', endTime: '23:00', artist: 'АНГЕЛ-ХРАНИТЕЛЬ' },
  { stageId: 'south', date: '2026-07-08', startTime: '23:00', endTime: '23:30', artist: 'ТРОЛЛЬ ГНЕТ ЕЛЬ' },
  { stageId: 'south', date: '2026-07-08', startTime: '23:30', endTime: '00:00', artist: 'ОБЕ-РЕК' },
  { stageId: 'south', date: '2026-07-09', startTime: '00:00', endTime: '00:30', artist: 'СКОЛОТ' },
  { stageId: 'south', date: '2026-07-09', startTime: '17:30', endTime: '18:00', artist: 'ДОНЭРА' },
  { stageId: 'south', date: '2026-07-09', startTime: '18:30', endTime: '19:00', artist: 'БАГИРА / BAGIRA' },
  { stageId: 'south', date: '2026-07-09', startTime: '19:00', endTime: '20:00', artist: 'БЕЗ Б / BEZ B' },
  { stageId: 'south', date: '2026-07-09', startTime: '20:00', endTime: '20:30', artist: 'АФФИНАЖ' },
  { stageId: 'south', date: '2026-07-09', startTime: '21:00', endTime: '21:30', artist: 'ПАВЕЛ ПИКОВСКИЙ' },
  { stageId: 'south', date: '2026-07-09', startTime: '21:30', endTime: '22:00', artist: 'ДРУГОЙ ВЕТЕР' },
  { stageId: 'south', date: '2026-07-10', startTime: '00:00', endTime: '00:30', artist: 'NAGART' },
  { stageId: 'south', date: '2026-07-10', startTime: '00:30', endTime: '01:00', artist: 'ХЕЛЬВЕГЕН / HELVEGEN' },
  { stageId: 'south', date: '2026-07-10', startTime: '20:15', endTime: '20:45', artist: 'ПЛАМЕНЕВ' },
  { stageId: 'south', date: '2026-07-10', startTime: '21:00', endTime: '21:30', artist: 'СЛОТ' },
  { stageId: 'south', date: '2026-07-11', startTime: '17:00', endTime: '17:30', artist: 'КАТЮША' },
  { stageId: 'south', date: '2026-07-11', startTime: '17:30', endTime: '18:00', artist: 'КЭЖУАЛ / CASUAL' },
  { stageId: 'south', date: '2026-07-11', startTime: '20:00', endTime: '20:30', artist: 'DRUMMATIX' },
  { stageId: 'south', date: '2026-07-11', startTime: '22:50', endTime: '23:20', artist: 'БИРТМАН' },

  // Западная сцена
  { stageId: 'west', date: '2026-07-08', startTime: '18:00', endTime: '18:30', artist: 'ТАПОК' },
  { stageId: 'west', date: '2026-07-08', startTime: '19:00', endTime: '19:30', artist: 'МАГНИТНАЯ АНОМАЛИЯ' },
  { stageId: 'west', date: '2026-07-08', startTime: '20:30', endTime: '21:00', artist: 'НЕБО ПОПОЛАМ' },
  { stageId: 'west', date: '2026-07-08', startTime: '22:00', endTime: '22:30', artist: 'РАЗНЫЕ ЛЮДИ, МУХОМОРЫ' },
  { stageId: 'west', date: '2026-07-08', startTime: '23:00', endTime: '23:30', artist: 'ФЕДУЛОВА' },
  { stageId: 'west', date: '2026-07-09', startTime: '00:00', endTime: '00:30', artist: 'ВКЛЮЧАЙ МИКРОФОН!' },
  { stageId: 'west', date: '2026-07-09', startTime: '01:00', endTime: '01:30', artist: 'ЧЕРНЫЙ ОБЕЛИСК' },
  { stageId: 'west', date: '2026-07-09', startTime: '01:30', endTime: '02:00', artist: 'СЕМЬ ШТУК БАКСОВ / 7000$' },
  { stageId: 'west', date: '2026-07-09', startTime: '17:00', endTime: '17:30', artist: 'ТРИ ВТОРЫХ' },
  { stageId: 'west', date: '2026-07-09', startTime: '17:30', endTime: '18:00', artist: 'ФАН МОД / FUN MODE' },
  { stageId: 'west', date: '2026-07-09', startTime: '22:00', endTime: '22:30', artist: 'ОТМОРОЗКИ' },
  { stageId: 'west', date: '2026-07-10', startTime: '01:30', endTime: '02:00', artist: 'RAVANNA' },
  { stageId: 'west', date: '2026-07-10', startTime: '18:30', endTime: '19:00', artist: 'ДМЦ' },
  { stageId: 'west', date: '2026-07-10', startTime: '20:00', endTime: '20:30', artist: 'ЯШНИКОВА' },
  { stageId: 'west', date: '2026-07-10', startTime: '22:00', endTime: '22:30', artist: '7 РАСА' },
  { stageId: 'west', date: '2026-07-10', startTime: '23:00', endTime: '23:30', artist: 'ВАСИЛИЙ УРИЕВСКИЙ' },
  { stageId: 'west', date: '2026-07-11', startTime: '00:00', endTime: '00:30', artist: 'TAISH' },
  { stageId: 'west', date: '2026-07-11', startTime: '17:00', endTime: '17:30', artist: 'КДРР / KDRR' },
  { stageId: 'west', date: '2026-07-11', startTime: '18:00', endTime: '18:30', artist: 'АНЯ ИЗ ПИТЕРА' },
  { stageId: 'west', date: '2026-07-11', startTime: '19:00', endTime: '19:30', artist: 'АРКТИДА' },
  { stageId: 'west', date: '2026-07-11', startTime: '20:00', endTime: '20:30', artist: 'AMALGAMA' },
  { stageId: 'west', date: '2026-07-11', startTime: '21:00', endTime: '21:30', artist: 'SELLOUT' },
  { stageId: 'west', date: '2026-07-11', startTime: '21:30', endTime: '22:00', artist: 'БАХЫТ-КОМПОТ' },
  { stageId: 'west', date: '2026-07-11', startTime: '23:00', endTime: '00:00', artist: 'ДЖОКОНДА' },

  // Сцена РЕН ТВ
  { stageId: 'ren-tv', date: '2026-07-09', startTime: '16:00', endTime: '16:30', artist: 'ГРАН-КУРАЖЪ' },
  { stageId: 'ren-tv', date: '2026-07-09', startTime: '19:00', endTime: '19:30', artist: 'МАРА' },
  { stageId: 'ren-tv', date: '2026-07-09', startTime: '19:40', endTime: '20:10', artist: 'МУЛЬТFИЛЬМЫ' },
  { stageId: 'ren-tv', date: '2026-07-09', startTime: '21:10', endTime: '21:40', artist: 'МОНГОЛ ШУУДАН' },
  { stageId: 'ren-tv', date: '2026-07-10', startTime: '15:30', endTime: '16:00', artist: 'ЭПИДЕМИЯ' },
  { stageId: 'ren-tv', date: '2026-07-10', startTime: '16:00', endTime: '16:30', artist: 'МУРАКАМИ' },
  { stageId: 'ren-tv', date: '2026-07-11', startTime: '15:00', endTime: '15:30', artist: 'КОСТЯ КУЛЯСОВ. АНИМАЦИЯ' },
  { stageId: 'ren-tv', date: '2026-07-12', startTime: '13:30', endTime: '14:00', artist: 'АНГЕЛ НЕБЕС' },
  { stageId: 'ren-tv', date: '2026-07-12', startTime: '14:30', endTime: '15:00', artist: 'БРИГАДНЫЙ ПОДРЯД' },
  { stageId: 'ren-tv', date: '2026-07-12', startTime: '17:00', endTime: '17:30', artist: 'ИГОРЬ РАСТЕРЯЕВ' },
];

export const autographSessions: AutographSession[] = rawAutographs.map((item) => ({
  id: `auto-${item.stageId}-${item.date}-${item.startTime}-${item.artist.slice(0, 8)}`,
  location: 'ПАЛАТОЧНЫЙ ГОРОДОК',
  headlinerId: buildHeadlinerId(item.artist),
  ...item,
}));
