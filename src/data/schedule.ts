import { Stage, SchedulePerformance } from '../types';

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

type RawPerformance = {
  stageId: Stage['id'];
  date: string;
  startTime: string;
  artist: string;
  isCompetition?: boolean;
};

const rawPerformances: RawPerformance[] = [
  // ЮЖНАЯ СЦЕНА — 8 июля
  { stageId: 'south', date: '2026-07-08', startTime: '15:00', artist: 'NADИ' },
  { stageId: 'south', date: '2026-07-08', startTime: '16:00', artist: 'ВЕРЕ ДИКТУМ / VERE DICTUM' },
  { stageId: 'south', date: '2026-07-08', startTime: '17:00', artist: 'ГРУППА Ё' },
  { stageId: 'south', date: '2026-07-08', startTime: '18:00', artist: 'МОСКВИТИН' },
  { stageId: 'south', date: '2026-07-08', startTime: '19:00', artist: 'ЛУЧШИЙ САМЫЙ ДЕНЬ' },
  { stageId: 'south', date: '2026-07-08', startTime: '20:00', artist: 'КАЛЕВАЛА' },
  { stageId: 'south', date: '2026-07-08', startTime: '21:00', artist: 'АНГЕЛ-ХРАНИТЕЛЬ' },
  { stageId: 'south', date: '2026-07-08', startTime: '22:00', artist: 'ОБЕ-РЕК' },
  { stageId: 'south', date: '2026-07-08', startTime: '23:00', artist: 'СКОЛОТ' },
  { stageId: 'south', date: '2026-07-09', startTime: '00:00', artist: 'КИРПИЧИ' },
  { stageId: 'south', date: '2026-07-09', startTime: '01:00', artist: 'ТРОЛЛЬ ГНЕТ ЕЛЬ' },
  // ЮЖНАЯ — 9 июля
  { stageId: 'south', date: '2026-07-09', startTime: '16:00', artist: 'ДОНЭРА' },
  { stageId: 'south', date: '2026-07-09', startTime: '17:00', artist: 'БАГИРА / BAGIRA' },
  { stageId: 'south', date: '2026-07-09', startTime: '18:00', artist: 'АФФИНАЖ' },
  { stageId: 'south', date: '2026-07-09', startTime: '19:00', artist: 'ПАВЕЛ ПИКОВСКИЙ' },
  { stageId: 'south', date: '2026-07-09', startTime: '20:00', artist: 'ДРУГОЙ ВЕТЕР' },
  { stageId: 'south', date: '2026-07-09', startTime: '21:00', artist: 'БЕЗ Б / BEZ B' },
  { stageId: 'south', date: '2026-07-09', startTime: '22:00', artist: 'NAGART' },
  { stageId: 'south', date: '2026-07-09', startTime: '23:00', artist: 'ХЕЛЬВЕГЕН / HELVEGEN' },
  { stageId: 'south', date: '2026-07-10', startTime: '00:00', artist: 'КОНЕЦ ФИЛЬМА' },
  { stageId: 'south', date: '2026-07-10', startTime: '01:00', artist: 'ROCK PRIVET' },
  // ЮЖНАЯ — 10 июля
  { stageId: 'south', date: '2026-07-10', startTime: '14:00', artist: 'ДЕКАБРЬ' },
  { stageId: 'south', date: '2026-07-10', startTime: '15:00', artist: 'ЛАСКАЛА / LASCALA' },
  { stageId: 'south', date: '2026-07-10', startTime: '16:05', artist: 'ХМЫРОВ' },
  { stageId: 'south', date: '2026-07-10', startTime: '17:10', artist: 'ПОЛНАЛЮБВИ / POLNALYUBVI' },
  { stageId: 'south', date: '2026-07-10', startTime: '18:15', artist: 'ПЛАМЕНЕВ' },
  { stageId: 'south', date: '2026-07-10', startTime: '19:20', artist: 'СЛОТ' },
  { stageId: 'south', date: '2026-07-10', startTime: '20:25', artist: 'НЭИЛ ШЕРИ' },
  { stageId: 'south', date: '2026-07-10', startTime: '21:30', artist: 'F.P.G.' },
  { stageId: 'south', date: '2026-07-10', startTime: '22:35', artist: 'ОПЕРАЦИЯ ПЛАСТИЛИН' },
  { stageId: 'south', date: '2026-07-10', startTime: '23:40', artist: 'AMATORY' },
  { stageId: 'south', date: '2026-07-11', startTime: '01:00', artist: 'ВИА «ВОЛГА-ВОЛГА»' },
  // ЮЖНАЯ — 11 июля
  { stageId: 'south', date: '2026-07-11', startTime: '14:00', artist: 'МАША И МЕДВЕДИ' },
  { stageId: 'south', date: '2026-07-11', startTime: '15:00', artist: 'КАТЮША' },
  { stageId: 'south', date: '2026-07-11', startTime: '16:00', artist: 'КЭЖУАЛ / CASUAL' },
  { stageId: 'south', date: '2026-07-11', startTime: '17:00', artist: 'ИНКОГНИТО' },
  { stageId: 'south', date: '2026-07-11', startTime: '18:00', artist: 'DRUMMATIX' },
  { stageId: 'south', date: '2026-07-11', startTime: '19:00', artist: 'СТИГМАТА / STIGMATA' },
  { stageId: 'south', date: '2026-07-11', startTime: '20:00', artist: 'ПОТОМУЧТО' },
  { stageId: 'south', date: '2026-07-11', startTime: '21:10', artist: 'БИРТМАН' },
  { stageId: 'south', date: '2026-07-11', startTime: '22:20', artist: 'ЙОРШ' },
  { stageId: 'south', date: '2026-07-11', startTime: '23:30', artist: 'RADIO TAPOK' },
  { stageId: 'south', date: '2026-07-12', startTime: '01:10', artist: 'НЕЙРОМОНАХ ФЕОФАН' },

  // ЗАПАДНАЯ — 8 июля
  { stageId: 'west', date: '2026-07-08', startTime: '16:00', artist: 'ТАПОК' },
  { stageId: 'west', date: '2026-07-08', startTime: '17:00', artist: 'МУХОМОРЫ' },
  { stageId: 'west', date: '2026-07-08', startTime: '18:00', artist: 'МАГНИТНАЯ АНОМАЛИЯ' },
  { stageId: 'west', date: '2026-07-08', startTime: '19:00', artist: 'НЕБО ПОПОЛАМ' },
  { stageId: 'west', date: '2026-07-08', startTime: '20:00', artist: 'РАЗНЫЕ ЛЮДИ' },
  { stageId: 'west', date: '2026-07-08', startTime: '21:00', artist: 'ФЕДУЛОВА' },
  { stageId: 'west', date: '2026-07-08', startTime: '22:00', artist: 'ВКЛЮЧАЙ МИКРОФОН!' },
  { stageId: 'west', date: '2026-07-08', startTime: '23:00', artist: 'ЧЕРНЫЙ ОБЕЛИСК' },
  { stageId: 'west', date: '2026-07-09', startTime: '00:00', artist: 'СЕМЬ ШТУК БАКСОВ / 7000$' },
  // ЗАПАДНАЯ — 9 июля
  { stageId: 'west', date: '2026-07-09', startTime: '12:00', artist: 'EMBERWOOD, ВЕТЕР, ЕЛЕНА JAYA', isCompetition: true },
  { stageId: 'west', date: '2026-07-09', startTime: '13:30', artist: 'НЕ МЕНЕЕ ПЯТИ ОБОРОТОВ', isCompetition: true },
  { stageId: 'west', date: '2026-07-09', startTime: '15:00', artist: 'ТРИ ВТОРЫХ' },
  { stageId: 'west', date: '2026-07-09', startTime: '16:00', artist: 'ФАН МОД / FUN MODE' },
  { stageId: 'west', date: '2026-07-09', startTime: '17:00', artist: 'НИНА СМИТ' },
  { stageId: 'west', date: '2026-07-09', startTime: '18:00', artist: 'АСТРА' },
  { stageId: 'west', date: '2026-07-09', startTime: '19:00', artist: 'САША И СИРОЖА' },
  { stageId: 'west', date: '2026-07-09', startTime: '20:00', artist: 'ОТМОРОЗКИ' },
  { stageId: 'west', date: '2026-07-09', startTime: '21:00', artist: 'РЯЗАНOFF' },
  { stageId: 'west', date: '2026-07-09', startTime: '22:00', artist: 'ОТАВА Ё' },
  { stageId: 'west', date: '2026-07-09', startTime: '23:00', artist: 'ДИСТЕМПЕР / DISTEMPER' },
  { stageId: 'west', date: '2026-07-10', startTime: '00:00', artist: 'РАВАННА / RAVANNA' },
  // ЗАПАДНАЯ — 10 июля
  { stageId: 'west', date: '2026-07-10', startTime: '12:00', artist: 'СВОБОДНЫЙ РЕЖИМ, VERRONA EX GREAT REVIVAL, МОРРОЗ', isCompetition: true },
  { stageId: 'west', date: '2026-07-10', startTime: '13:30', artist: '#СЕВАИВАНОВ', isCompetition: true },
  { stageId: 'west', date: '2026-07-10', startTime: '14:00', artist: 'НИКОЛАЙ ГРИНЬКО', isCompetition: true },
  { stageId: 'west', date: '2026-07-10', startTime: '15:00', artist: 'МЕЩЕРА' },
  { stageId: 'west', date: '2026-07-10', startTime: '16:00', artist: 'АННУШКАА' },
  { stageId: 'west', date: '2026-07-10', startTime: '17:00', artist: 'ДМЦ' },
  { stageId: 'west', date: '2026-07-10', startTime: '18:00', artist: 'РЕКОРД ОРКЕСТР' },
  { stageId: 'west', date: '2026-07-10', startTime: '19:00', artist: 'СОВА' },
  { stageId: 'west', date: '2026-07-10', startTime: '20:00', artist: '7 РАСА' },
  { stageId: 'west', date: '2026-07-10', startTime: '21:00', artist: 'ВАСИЛИЙ УРИЕВСКИЙ' },
  { stageId: 'west', date: '2026-07-10', startTime: '22:00', artist: 'TAISH' },
  { stageId: 'west', date: '2026-07-10', startTime: '23:00', artist: 'ЯШНИКОВА' },
  { stageId: 'west', date: '2026-07-11', startTime: '00:00', artist: 'КЛЮЧЕВАЯ' },
  // ЗАПАДНАЯ — 11 июля
  { stageId: 'west', date: '2026-07-11', startTime: '12:00', artist: 'СЕРДЦЕ ТРУ, VERMOL, ГАБАРИТ', isCompetition: true },
  { stageId: 'west', date: '2026-07-11', startTime: '14:20', artist: 'ДИСЦИПЛИНА' },
  { stageId: 'west', date: '2026-07-11', startTime: '15:00', artist: 'КДРР / KDRR' },
  { stageId: 'west', date: '2026-07-11', startTime: '16:00', artist: 'АНЯ ИЗ ПИТЕРА' },
  { stageId: 'west', date: '2026-07-11', startTime: '17:00', artist: 'АРКТИДА' },
  { stageId: 'west', date: '2026-07-11', startTime: '18:00', artist: 'AMALGAMA' },
  { stageId: 'west', date: '2026-07-11', startTime: '19:00', artist: 'СЕЛЛАУТ / SELLOUT' },
  { stageId: 'west', date: '2026-07-11', startTime: '20:00', artist: 'БАХЫТ-КОМПОТ' },
  { stageId: 'west', date: '2026-07-11', startTime: '21:00', artist: 'ПИТОНЫ 3000' },
  { stageId: 'west', date: '2026-07-11', startTime: '22:00', artist: 'ДЖОКОНДА' },
  { stageId: 'west', date: '2026-07-11', startTime: '23:00', artist: 'ТОРБА-НА-КРУЧЕ' },
  { stageId: 'west', date: '2026-07-12', startTime: '00:00', artist: 'НАКОНЕЧНЫЙ' },

  // СЦЕНА РЕН ТВ — 9 июля
  { stageId: 'ren-tv', date: '2026-07-09', startTime: '15:00', artist: 'ГРАН-КУРАЖЪ' },
  { stageId: 'ren-tv', date: '2026-07-09', startTime: '16:00', artist: 'КАЛИНОВ МОСТ' },
  { stageId: 'ren-tv', date: '2026-07-09', startTime: '17:05', artist: 'МАРА' },
  { stageId: 'ren-tv', date: '2026-07-09', startTime: '18:10', artist: 'МУЛЬТFИЛЬМЫ' },
  { stageId: 'ren-tv', date: '2026-07-09', startTime: '19:15', artist: 'МОНГОЛ ШУУДАН' },
  { stageId: 'ren-tv', date: '2026-07-09', startTime: '20:20', artist: 'УНДЕРВУД' },
  { stageId: 'ren-tv', date: '2026-07-09', startTime: '21:25', artist: 'КРЕМАТОРИЙ' },
  { stageId: 'ren-tv', date: '2026-07-09', startTime: '22:35', artist: 'LUMEN' },
  // РЕН ТВ — 10 июля
  { stageId: 'ren-tv', date: '2026-07-10', startTime: '14:00', artist: 'МЕЛЬНИЦА' },
  { stageId: 'ren-tv', date: '2026-07-10', startTime: '15:00', artist: '7Б' },
  { stageId: 'ren-tv', date: '2026-07-10', startTime: '16:10', artist: 'СУРГАНОВА И ОРКЕСТР' },
  { stageId: 'ren-tv', date: '2026-07-10', startTime: '17:20', artist: 'ЭПИДЕМИЯ' },
  { stageId: 'ren-tv', date: '2026-07-10', startTime: '18:30', artist: 'МУРАКАМИ' },
  { stageId: 'ren-tv', date: '2026-07-10', startTime: '19:40', artist: 'БРАВО' },
  { stageId: 'ren-tv', date: '2026-07-10', startTime: '21:00', artist: 'СЕРЬГА' },
  { stageId: 'ren-tv', date: '2026-07-10', startTime: '22:10', artist: 'ГОРШЕНЕВ' },
  { stageId: 'ren-tv', date: '2026-07-10', startTime: '23:30', artist: 'АЛИСА' },
  // РЕН ТВ — 11 июля
  { stageId: 'ren-tv', date: '2026-07-11', startTime: '14:00', artist: 'КНЯZZ' },
  { stageId: 'ren-tv', date: '2026-07-11', startTime: '15:00', artist: 'ПИЛОТ' },
  { stageId: 'ren-tv', date: '2026-07-11', startTime: '16:20', artist: 'КОСТЯ КУЛЯСОВ. АНИМАЦИЯ' },
  { stageId: 'ren-tv', date: '2026-07-11', startTime: '17:40', artist: 'СЕРГЕЙ БОБУНЕЦ' },
  { stageId: 'ren-tv', date: '2026-07-11', startTime: '19:00', artist: 'ВЯЧЕСЛАВ БУТУСОВ' },
  { stageId: 'ren-tv', date: '2026-07-11', startTime: '20:20', artist: 'АРИЯ' },
  { stageId: 'ren-tv', date: '2026-07-11', startTime: '21:40', artist: 'ПИКНИК' },
  { stageId: 'ren-tv', date: '2026-07-11', startTime: '23:00', artist: 'ВАДИМ САМОЙЛОВ' },
  // РЕН ТВ — 12 июля
  { stageId: 'ren-tv', date: '2026-07-12', startTime: '12:00', artist: 'АНГЕЛ НЕБЕС' },
  { stageId: 'ren-tv', date: '2026-07-12', startTime: '13:00', artist: 'БРИГАДНЫЙ ПОДРЯД' },
  { stageId: 'ren-tv', date: '2026-07-12', startTime: '14:15', artist: 'ZNAKI' },
  { stageId: 'ren-tv', date: '2026-07-12', startTime: '15:30', artist: 'ИГОРЬ РАСТЕРЯЕВ' },
];

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function fromMinutes(total: number): string {
  const normalized = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function buildSchedule(items: RawPerformance[]): SchedulePerformance[] {
  const sorted = [...items].sort((a, b) => {
    if (a.stageId !== b.stageId) return a.stageId.localeCompare(b.stageId);
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return toMinutes(a.startTime) - toMinutes(b.startTime);
  });

  return sorted.map((item, index) => {
    const sameStageNext = sorted.slice(index + 1).find((next) => next.stageId === item.stageId);
    const startMinutes = toMinutes(item.startTime);
    let endMinutes = startMinutes + 60;

    if (sameStageNext && sameStageNext.date === item.date) {
      let nextStart = toMinutes(sameStageNext.startTime);
      if (nextStart <= startMinutes) {
        nextStart += 24 * 60;
      }
      endMinutes = Math.min(nextStart, startMinutes + 60);
    }

    const endTime = fromMinutes(endMinutes);

    return {
      id: `${item.stageId}-${item.date}-${item.startTime}-${item.artist.slice(0, 12)}`,
      stageId: item.stageId,
      date: item.date,
      startTime: item.startTime,
      endTime,
      artist: item.artist,
      isCompetition: item.isCompetition,
    };
  });
}

export const schedulePerformances: SchedulePerformance[] = buildSchedule(rawPerformances);
