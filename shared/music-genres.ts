type GenreTag = { name: string };

const labels: Record<string, string> = {
  'psychedelic folk': 'Психоделический фолк', 'psychobilly': 'Сайкобилли',
  'rap rock': 'Рэп-рок', 'folk punk': 'Фолк-панк', 'groove metal': 'Грув-метал',
  'glam metal': 'Глэм-метал', 'psychedelic rock': 'Психоделический рок',
  'avant garde metal': 'Авангардный метал', 'eurodance': 'Евродэнс', 'latin pop': 'Латин-поп',
  'folkcore': 'Фолккор', 'latin rock': 'Латин-рок', 'funk rock': 'Фанк-рок', 'funk metal': 'Фанк-метал',
  'funk': 'Фанк', 'soul': 'Соул', 'r&b': 'Ритм-н-блюз', 'rnb': 'Ритм-н-блюз',
  'deathcore': 'Дэткор', 'death metal': 'Дэт-метал', 'progressive metal': 'Прогрессивный метал',
  'progressive rock': 'Прогрессивный рок', 'post rock': 'Построк', 'math rock': 'Мат-рок',
  'djent': 'Джент', 'symphonic rock': 'Симфонический рок', 'gothic doom metal': 'Готик-дум-метал',
  'synthpop': 'Синти-поп', 'synth pop': 'Синти-поп', 'synth rock': 'Синти-рок',
  'electropop': 'Электропоп', 'electro pop': 'Электропоп', 'electronic rock': 'Электроник-рок',
  'new wave': 'Новая волна', 'reggae': 'Регги', 'dub': 'Даб', 'reggae rock': 'Регги-рок',
  'house': 'Хаус', 'techno': 'Техно', 'trance': 'Транс', 'trip hop': 'Трип-хоп',
  'dance pop': 'Танцевальный поп', 'disco': 'Диско', 'disco pop': 'Диско-поп',
  'classical': 'Классическая музыка', 'opera': 'Опера', 'symphonic music': 'Симфоническая музыка',
  'jazz rock': 'Джаз-рок', 'jazz fusion': 'Джаз-фьюжн', 'gypsy punk': 'Цыганский панк',
  'cabaret rock': 'Кабаре-рок', 'dark cabaret': 'Тёмное кабаре', 'comedy rock': 'Камеди-рок',
  'electroclash': 'Электроклэш', 'breakbeat': 'Брейкбит', 'big beat': 'Биг-бит',
  rock: 'Рок', 'russian rock': 'Русский рок', russianrock: 'Русский рок',
  'classic russian rock': 'Классический русский рок', 'classic rock': 'Классический рок',
  'new russian rock': 'Новый русский рок', 'new wave of russian rock': 'Новая волна русского рока',
  'good russian rock': 'Русский рок', 'alternative rock': 'Альтернативный рок',
  alternative: 'Альтернатива', 'russian alternative': 'Русская альтернатива',
  'punk rock': 'Панк-рок', punk: 'Панк', 'russian punk': 'Русский панк',
  'pop punk': 'Поп-панк', 'ska punk': 'Ска-панк', ska: 'Ска',
  'hardcore punk': 'Хардкор-панк', 'horror punk': 'Хоррор-панк',
  'melodic punk': 'Мелодичный панк', 'anarcho punk': 'Анархо-панк',
  'political punk': 'Политический панк', 'californian punk': 'Калифорнийский панк',
  streetpunk: 'Уличный панк', 'street punk': 'Уличный панк', oi: 'Уличный панк',
  'dzen punk': 'Дзен-панк', 'punk rock russian rock horror punk': 'Хоррор-панк',
  metal: 'Метал', 'russian metal': 'Русский метал', 'heavy metal': 'Хеви-метал',
  'power metal': 'Пауэр-метал', 'hard rock': 'Хард-рок', 'nu metal': 'Ню-метал',
  metalcore: 'Металкор', 'melodic metalcore': 'Мелодичный металкор',
  'alternative metal': 'Альтернативный метал', 'gothic metal': 'Готик-метал',
  'folk metal': 'Фолк-метал', 'russian folk metal': 'Русский фолк-метал',
  'black metal': 'Блэк-метал', 'russian black metal': 'Русский блэк-метал',
  'raw black metal': 'Сырой блэк-метал', 'atmospheric black metal': 'Атмосферный блэк-метал',
  'folk black metal': 'Фолк-блэк-метал', 'pagan metal': 'Пейган-метал',
  'slavonic pagan metal': 'Славянский пейган-метал', 'thrash metal': 'Трэш-метал',
  'symphonic metal': 'Симфоник-метал', 'melodic metal': 'Мелодичный метал',
  'melodic death metal': 'Мелодичный дэт-метал', 'doom metal': 'Дум-метал',
  'funeral doom metal': 'Фьюнерал-дум-метал', 'industrial metal': 'Индастриал-метал',
  'dark metal': 'Дарк-метал', 'love metal': 'Романтический метал',
  'romantic metal': 'Романтический метал',
  folk: 'Фолк', 'russian folk': 'Русский фолк', 'folk rock': 'Фолк-рок',
  'russian folk rock': 'Русский фолк-рок', 'indie folk': 'Инди-фолк',
  'beer folk': 'Пивной фолк', 'folk noir': 'Мрачный фолк', neofolk: 'Неофолк',
  'neo folk': 'Неофолк', folktronica: 'Фолк-электроника', ethnic: 'Этника',
  acoustic: 'Акустика', 'singer songwriter': 'Авторская песня',
  'russian songwriter': 'Русская авторская песня', bard: 'Бардовская песня',
  indie: 'Инди', 'indie rock': 'Инди-рок', indierock: 'Инди-рок',
  'indie pop': 'Инди-поп', 'pop rock': 'Поп-рок', pop: 'Поп', britpop: 'Брит-поп',
  grunge: 'Гранж', 'russian grunge': 'Русский гранж', 'post grunge': 'Постгранж',
  'post punk': 'Постпанк', 'post hardcore': 'Постхардкор', hardcore: 'Хардкор',
  emocore: 'Эмокор', screamo: 'Скримо', easycore: 'Изикор', poppycore: 'Попкор',
  heartcore: 'Харткор', blackgaze: 'Блэкгейз', industrial: 'Индастриал',
  'gothic rock': 'Готик-рок', gothic: 'Готика', 'art rock': 'Арт-рок',
  'mystic rock': 'Мистический рок', 'poetic rock': 'Поэтический рок',
  'rock fusion': 'Рок-фьюжн', 'garage rock': 'Гаражный рок',
  'rock n roll': 'Рок-н-ролл', rocknroll: 'Рок-н-ролл', 'rock and roll': 'Рок-н-ролл',
  rockabilly: 'Рокабилли', softrock: 'Софт-рок', bluesrock: 'Блюз-рок',
  blues: 'Блюз', rap: 'Рэп', 'russian rap': 'Русский рэп', 'hip hop': 'Хип-хоп',
  'underground hip hop': 'Андеграундный хип-хоп', 'underground rap': 'Андеграундный рэп',
  'abstract hip hop': 'Абстрактный хип-хоп', rapcore: 'Рэпкор',
  'country rap': 'Кантри-рэп', 'christian rap': 'Христианский рэп',
  'nuclear rap': 'Ядерный рэп', country: 'Кантри', chanson: 'Шансон',
  'chanson noir': 'Мрачный шансон', jazz: 'Джаз', 'vocal jazz': 'Вокальный джаз',
  swing: 'Свинг', electronic: 'Электроника', electronica: 'Электроника',
  ambient: 'Эмбиент', 'dark ambient': 'Тёмный эмбиент',
  'drum and bass': 'Драм-н-бейс', neurofunk: 'Нейрофанк',
  dance: 'Танцевальная музыка', rave: 'Рейв', 'russian rave': 'Русский рейв',
  chillout: 'Чиллаут', idm: 'Интеллектуальная электроника', minimal: 'Минимал',
  experimental: 'Экспериментальная музыка', lofi: 'Лоу-фай', darkwave: 'Дарквейв',
  'j pop': 'Японский поп', jpop: 'Японский поп',
  waltz: 'Вальс', walz: 'Вальс',
};

function genreKey(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('ru').replace(/['’]/g, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
}

const translatedLabels = new Map(Object.values(labels).map(label => [genreKey(label), label]));

/** One-time legacy migration only. Runtime artist genres are always editorial. */
export function getRussianGenres(tags?: readonly GenreTag[] | null, limit = 6): string[] {
  const translated = (tags || []).map(tag => {
    const value = tag.name.trim();
    return labels[genreKey(value)] || translatedLabels.get(genreKey(value)) || '';
  }).filter(Boolean);
  return [...new Set(translated)].slice(0, limit);
}

/** Shared vocabulary for the CMS and every client. */
export const ARTIST_GENRE_OPTIONS = [...new Set(Object.values(labels))].sort((a,b)=>a.localeCompare(b,'ru'));
const available = new Set(ARTIST_GENRE_OPTIONS);
export function isArtistGenre(value: unknown): value is string { return typeof value === 'string' && available.has(value); }
export function normalizeManualArtistGenres(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter(isArtistGenre))] : [];
}
/** Never derive genres from Last.fm, including when an editor clears the selection. */
export function getArtistGenres(artist: { genres?: readonly string[] }, limit=6): string[] {
  return normalizeManualArtistGenres(artist.genres).slice(0,limit);
}
