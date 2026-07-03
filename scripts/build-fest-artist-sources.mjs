import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = await fetch('https://uletayfest.ru/').then((r) => r.text());

const recId = '904358326';
const marker = `id="rec${recId}"`;
const start = html.indexOf(marker);
const end = html.indexOf('id="rec', start + marker.length);
const block = html.slice(start, end);

const seen = new Set();
const orderedUrls = [];
for (const m of block.matchAll(/data-original=['"](https:\/\/static\.tildacdn\.com\/[^'"]+\.(?:png|jpg|jpeg|webp))["']/gi)) {
  if (!seen.has(m[1])) {
    seen.add(m[1]);
    orderedUrls.push(m[1]);
  }
}

const decorFiles = new Set(['_-1.png', '_-2.png', '_260x100.png', 'Uchastniki_konkursno.png', '__11.png', '__33.png', '__55.png', '_6_.png']);
const decorPatterns = [/^_\.png$/i, /^__\.png$/i, /^-\.png$/i, /^_1\.png$/i, /^1\.png$/i, /^Z_\.png$/i];

function isDecor(url) {
  const file = url.split('/').pop() ?? '';
  if (decorFiles.has(file)) return true;
  return decorPatterns.some((re) => re.test(file));
}

const artistUrls = orderedUrls.filter((url) => !isDecor(url));

// Порядок участников с allfest.ru (совпадает с каруселью на uletayfest.ru: Алиса, Пикник, …)
const lineupOrder = [
  'АЛИСА',
  'ПИКНИК',
  'ВЯЧЕСЛАВ БУТУСОВ',
  'ЭПИДЕМИЯ',
  'КНЯZZ',
  'ПИЛОТ',
  'RADIO TAPOK',
  'МЕЛЬНИЦА',
  'ПЛАМЕНЕВ',
  'ПОЛНАЛЮБВИ / POLNALYUBVI',
  'НЕЙРОМОНАХ ФЕОФАН',
  'AMATORY',
  'КИРПИЧИ',
  'DRUMMATIX',
  'ROCK PRIVET',
  'НЭИЛ ШЕРИ',
  'ЯШНИКОВА',
  'ЛАСКАЛА / LASCALA',
  'АНГЕЛ-ХРАНИТЕЛЬ',
  '7Б',
  'ОПЕРАЦИЯ ПЛАСТИЛИН',
  'ДРУГОЙ ВЕТЕР',
  'АНЯ ИЗ ПИТЕРА',
  'СТИГМАТА / STIGMATA',
  'АНИМАЦИЯ',
  'БАГИРА / BAGIRA',
  'ВКЛЮЧАЙ МИКРОФОН!',
  'СЕРЬГА',
  'ХМЫРОВ',
  'ДМЦ',
  'НАКОНЕЧНЫЙ',
  'ОТМОРОЗКИ',
  'БЕЗ Б / BEZ B',
  'TAISH',
  'СЕЛЛАУТ / SELLOUT',
  'УНДЕРВУД',
  'NAGART',
  'МЕЩЕРА',
  'АСТРА',
  'ДЖОКОНДА',
  'ХЕЛЬВЕГЕН / HELVEGEN',
  'F.P.G.',
  'ЧЕРНЫЙ ОБЕЛИСК',
  'МУРАКАМИ',
  'СЛОТ',
  'ОТАВА Ё',
  'АФФИНАЖ',
  'КЛЮЧЕВАЯ',
  'КЭЖУАЛ / CASUAL',
  'КАЛИНОВ МОСТ',
  'ВАСИЛИЙ УРИЕВСКИЙ',
  'ПАВЕЛ ПИКОВСКИЙ',
  'МАГНИТНАЯ АНОМАЛИЯ',
  'КОНЕЦ ФИЛЬМА',
  'ФЕДУЛОВА',
  'МУЛЬТFИЛЬМЫ',
  'ЛУЧШИЙ САМЫЙ ДЕНЬ',
  'СУРГАНОВА И ОРКЕСТР',
  'ZNAKI',
  'ЙОРШ',
  'ДЕКАБРЬ',
  'ПОТОМУЧТО',
  'АННУШКАА',
  'РЕКОРД ОРКЕСТР',
  'ОБЕ-РЕК',
  'КРЕМАТОРИЙ',
  'БРИГАДНЫЙ ПОДРЯД',
  'АРИЯ',
  '7 РАСА',
  'РАВАННА / RAVANNA',
  'ГРАН-КУРАЖЪ',
  'LUMEN',
  'МАРА',
  'МОНГОЛ ШУУДАН',
  'МУЛЬТFИЛЬМЫ',
  'NADИ',
  'ГРУППА Ё',
  'МОСКВИТИН',
  'КАЛЕВАЛА',
  'ТРОЛЛЬ ГНЕТ ЕЛЬ',
  'СКОЛОТ',
  'ТАПОК',
  'МУХОМОРЫ',
  'НЕБО ПОПОЛАМ',
  'РАЗНЫЕ ЛЮДИ',
  'СЕМЬ ШТУК БАКСОВ / 7000$',
  'ДОНЭРА',
  'ВЕРЕ ДИКТУМ / VERE DICTUM',
  'ГОРШЕНЕВА',
  'СЕРГЕЙ БОБУНЕЦ',
  'ВАДИМ САМОЙЛОВ',
  'БРАВО',
  'ИГОРЬ РАСТЕРЯЕВ',
  'ИНКОГНИТО',
  'КАТЮША',
  'МАША И МЕДВЕДИ',
  'БИРТМАН',
  'АНГЕЛ НЕБЕС',
  'АРКТИДА',
  'AMALGAMA',
  'БАХЫТ-КОМПОТ',
  'ДИСТЕМПЕР / DISTEMPER',
  'ДИСЦИПЛИНА',
  'ВИА «ВОЛГА-ВОЛГА»',
  'НИНА СМИТ',
  'САША И СИРОЖА',
  'РЯЗАНOFF',
  'ТОРБА-НА-КРУЧЕ',
  'ТРИ ВТОРЫХ',
  'ФАН МОД / FUN MODE',
  'ПИТОНЫ 3000',
  'СОВА',
  '#СЕВАИВАНОВ',
  'NEARINAMENYA',
];

const filenameHints = {
  lumen: ['LUMEN'],
  gran_kurazh: ['ГРАН-КУРАЖЪ'],
  bagira: ['БАГИРА / BAGIRA'],
  gorshenev: ['ГОРШЕНЕВА', 'ГОРШЕНЕВ'],
  stigmata: ['СТИГМАТА / STIGMATA'],
  amatory: ['AMATORY'],
  fpg: ['F.P.G.'],
  drummatix: ['DRUMMATIX'],
  rock_privet: ['ROCK PRIVET'],
  nagart: ['NAGART'],
  znaki: ['ZNAKI'],
  lascala: ['ЛАСКАЛА / LASCALA'],
  ravanna: ['РАВАННА / RAVANNA', 'RAVANNA'],
  sellout: ['СЕЛЛАУТ / SELLOUT', 'SELLOUT'],
  casual: ['КЭЖУАЛ / CASUAL'],
  taish: ['TAISH'],
  donera: ['ДОНЭРА'],
  '7000': ['СЕМЬ ШТУК БАКСОВ / 7000$'],
  zz: ['КНЯZZ'],
};

const artists = {};

for (let i = 0; i < lineupOrder.length && i < artistUrls.length; i++) {
  artists[lineupOrder[i]] = artistUrls[i];
}

for (const url of artistUrls) {
  const file = url.split('/').pop()?.replace(/\.[^.]+$/, '').toLowerCase() ?? '';
  const key = file.replace(/[^a-z0-9]/g, '');
  for (const [hint, names] of Object.entries(filenameHints)) {
    const hintKey = hint.replace(/[^a-z0-9]/g, '');
    if (key === hintKey || (hintKey.length >= 3 && key.includes(hintKey))) {
      for (const name of names) {
        artists[name] = url;
      }
    }
  }
}

const content = JSON.parse(readFileSync(join(root, 'cms', 'seed', 'content.json'), 'utf8'));
const scheduleArtists = [...new Set(content.schedule.map((s) => s.artist))];
const autographArtists = [...new Set(content.autographs.map((a) => a.artist))];
const allArtists = [...new Set([...scheduleArtists, ...autographArtists])];

function norm(s) {
  return s.toUpperCase().replace(/Ё/g, 'Е').replace(/\s+/g, ' ').trim();
}

const aliases = {
  'ГОРШЕНЕВ': 'ГОРШЕНЕВА',
  'RADIO ТАРО': 'RADIO TAPOK',
  'RAVANNA': 'РАВАННА / RAVANNA',
  'SELLOUT': 'СЕЛЛАУТ / SELLOUT',
  'МЕЩЕРАА': 'МЕЩЕРА',
  'РАЗНЫЕ ЛЮДИ, МУХОМОРЫ': 'МУХОМОРЫ',
  'СВОБОДНЫЙ РЕЖИМ, VERRONA EX GREAT REVIVAL, МОРРОЗ': 'СВОБОДНЫЙ РЕЖИМ',
  'СЕРДЦЕ ТРУ, VERMOL, ГАБАРИТ': 'ГАБАРИТ',
  'EMBERWOOD, ВЕТЕР, ЕЛЕНА JAYA': 'EMBERWOOD',
};

for (const artist of allArtists) {
  if (artists[artist]) continue;
  const alias = aliases[artist];
  if (alias && artists[alias]) {
    artists[artist] = artists[alias];
    continue;
  }
  const n = norm(artist.split('/')[0]);
  for (const [name, url] of Object.entries(artists)) {
    const m = norm(name.split('/')[0]);
    if (n === m || n.includes(m) || m.includes(n)) {
      artists[artist] = url;
      break;
    }
  }
}

const out = {
  source: 'https://uletayfest.ru/',
  artists,
};

writeFileSync(join(root, 'scripts', 'fest-artist-sources.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');

const matched = allArtists.filter((a) => artists[a]);
console.log(`Mapped ${Object.keys(artists).length} entries, ${matched.length}/${allArtists.length} schedule artists`);
console.log('ПИКНИК =>', artists['ПИКНИК']?.split('/').pop());
console.log('АЛИСА =>', artists['АЛИСА']?.split('/').pop());
