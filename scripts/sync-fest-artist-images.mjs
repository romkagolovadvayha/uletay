import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorker, PSM } from 'tesseract.js';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS_DIR = join(root, 'assets', 'images', 'artists');
const UPLOADS_DIR = join(root, 'uploads', 'images');
const CACHE_DIR = join(root, 'scripts', '.fest-cache');
const REPORT_PATH = join(root, 'scripts', 'fest-artist-sync-report.json');
const SOURCES_PATH = join(root, 'scripts', 'fest-artist-sources.json');
const GENERATED_TS = join(root, 'src', 'data', 'festArtistAssets.generated.ts');

const PRESET = { width: 800, height: 800, quality: 82 };

const FILENAME_ARTISTS = {
  lumen: 'LUMEN',
  gran_kurazh: 'ГРАН-КУРАЖЪ',
  bagira: 'БАГИРА / BAGIRA',
  gorshenev: 'ГОРШЕНЕВА',
  stigmata: 'СТИГМАТА / STIGMATA',
  amatory: 'AMATORY',
  fpg: 'F.P.G.',
  drummatix: 'DRUMMATIX',
  rock_privet: 'ROCK PRIVET',
  nagart: 'NAGART',
  znaki: 'ZNAKI',
  lascala: 'ЛАСКАЛА / LASCALA',
  ravanna: 'РАВАННА / RAVANNA',
  sellout: 'СЕЛЛАУТ / SELLOUT',
  casual: 'КЭЖУАЛ / CASUAL',
  taish: 'TAISH',
  donera1: 'ДОНЭРА',
  donera: 'ДОНЭРА',
  '7000': 'СЕМЬ ШТУК БАКСОВ / 7000$',
  zz: 'КНЯZZ',
};

const OCR_ALIASES = {
  АЛИС: 'АЛИСА',
  АЛИСА: 'АЛИСА',
  ПИКНИК: 'ПИКНИК',
  RADIOTAPOK: 'RADIO TAPOK',
  RADИOTAPOK: 'RADIO TAPOK',
  RADIOTAPOК: 'RADIO TAPOK',
  БУТУСОВ: 'ВЯЧЕСЛАВ БУТУСОВ',
  ВЯЧЕСЛАВБУТУСОВ: 'ВЯЧЕСЛАВ БУТУСОВ',
  АРИЯ: 'АРИЯ',
  СУРГАНОВА: 'СУРГАНОВА И ОРКЕСТР',
  ОРКЕСТР: null,
  КОСТЯКУЛЯСОВ: 'КОСТЯ КУЛЯСОВ. АНИМАЦИЯ',
  POLNALYUBVI: 'ПОЛНАЛЮБВИ / POLNALYUBVI',
  PORELNALYUBYVI: 'ПОЛНАЛЮБВИ / POLNALYUBVI',
  ПОЛНАЛЮБВИ: 'ПОЛНАЛЮБВИ / POLNALYUBVI',
  НЕБОПОПОЛАМ: 'НЕБО ПОПОЛАМ',
  НЕБОПФНОЛАМ: 'НЕБО ПОПОЛАМ',
  НЕБОПФПОЛАМ: 'НЕБО ПОПОЛАМ',
  POLNALYUBYVI: 'ПОЛНАЛЮБВИ / POLNALYUBVI',
  МОСНВИТИН: 'МОСКВИТИН',
  МОСКВИТИН: 'МОСКВИТИН',
  ВОЛГАВОЛГА: 'ВИА «ВОЛГА-ВОЛГА»',
  BHABHA: 'ВИА «ВОЛГА-ВОЛГА»',
  НИНАСМИТ: 'НИНА СМИТ',
  СМИТ: 'НИНА СМИТ',
  МУРАКАМИ: 'МУРАКАМИ',
  MYPAKAMI: 'МУРАКАМИ',
  MYPAKAMA: 'МУРАКАМИ',
  MURAKAMI: 'МУРАКАМИ',
  ЭПИДЕМИЯ: 'ЭПИДЕМИЯ',
  КАЛИНОВМОСТ: 'КАЛИНОВ МОСТ',
  КРЕМАТОРИЙ: 'КРЕМАТОРИЙ',
  МЕЛЬНИЦА: 'МЕЛЬНИЦА',
  ЧЕРНЫЙОБЕЛИСК: 'ЧЕРНЫЙ ОБЕЛИСК',
  YLETAY: null,
  УЛЕТАЙ: null,
  ULETAY: null,
  ИЮЛЯ: null,
  УДМУРТИЯ: null,
  VIETOU: null,
  VIETAU: null,
  VIETAM: null,
  ГЕНЕРАЛЬНЫЙ: null,
  ПАРТНЕР: null,
  ФЕСТИВАЛЯ: null,
};

const GENERIC_WORDS = new Set(['ГРУППА', 'ОРКЕСТР', 'ВИА', 'ROCK', 'BAND', 'ГРУПП']);

function shouldRejectMatch(ocrText, artist) {
  const n = norm(ocrText);
  if (n.includes('ЦУПЛУНА')) return true;
  if (artist === 'ГРУППА Ё' && n.includes('ЦУПЛУНА')) return true;
  return false;
}

function norm(s) {
  return s.toUpperCase().replace(/Ё/g, 'Е').replace(/[^A-ZА-Я0-9]/g, '');
}

function cachePathForUrl(url) {
  const parts = url.split('/');
  const file = parts.pop() ?? 'image';
  const folder = parts.pop() ?? 'unknown';
  const safeFolder = folder.replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeFile = file.replace(/[^a-zA-Z0-9._-]/g, '_');
  return join(CACHE_DIR, `${safeFolder}_${safeFile}`);
}

function slugify(artist) {
  return norm(artist.split('/')[0]).toLowerCase().slice(0, 48) || 'artist';
}

function artistFromFilename(url) {
  const stem = url.split('/').pop()?.replace(/\.[^.]+$/, '').toLowerCase() ?? '';
  const key = stem.replace(/[^a-z0-9]/g, '');
  if (stem === 'photo.png' || stem === 'photo') return null;
  for (const [hint, artist] of Object.entries(FILENAME_ARTISTS)) {
    const hk = hint.replace(/[^a-z0-9]/g, '');
    if (key === hk) return artist;
  }
  return null;
}

async function fetchFestImageUrls() {
  const html = await fetch('https://uletayfest.ru/').then((r) => r.text());
  const recId = '904358326';
  const marker = `id="rec${recId}"`;
  const start = html.indexOf(marker);
  const end = html.indexOf('id="rec', start + marker.length);
  const block = html.slice(start, end);

  const seen = new Set();
  const urls = [];
  for (const m of block.matchAll(/data-original=['"](https:\/\/static\.tildacdn\.com\/[^'"]+\.(?:png|jpg|jpeg|webp))["']/gi)) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      urls.push(m[1]);
    }
  }

  const decor = new Set(['_-1.png', '_-2.png', '_260x100.png', 'Uchastniki_konkursno.png', '__11.png', '__33.png', '__55.png', '_6_.png', '___.png']);
  return urls.filter((url) => {
    const file = url.split('/').pop() ?? '';
    if (decor.has(file)) return false;
    if (file === '_.png') return false;
    if (/^_\.png$/i.test(file)) return false;
    if (/^__\.png$/i.test(file)) return false;
    if (/^-\.png$/i.test(file)) return false;
    if (/^Z_\.png$/i.test(file)) return false;
    return true;
  });
}

function buildArtistIndex(artists) {
  const entries = [];
  const seen = new Set();
  for (const artist of artists) {
    const parts = [artist, artist.split('/')[0].trim(), artist.split('/').pop()?.trim()].filter(Boolean);
    for (const part of parts) {
      const n = norm(part);
      if (n.length >= 3 && !seen.has(`${artist}:${n}`)) {
        seen.add(`${artist}:${n}`);
        entries.push({ artist, n, len: n.length });
      }
    }
    for (const word of artistWords(artist)) {
      if (word.length >= 5 && !seen.has(`${artist}:${word}`)) {
        seen.add(`${artist}:${word}`);
        entries.push({ artist, n: word, len: word.length });
      }
    }
  }
  entries.sort((a, b) => b.len - a.len);
  return entries;
}

function artistWords(artist) {
  return artist
    .split(/[\s/.,+|«»"'\-&]+/)
    .map((w) => norm(w))
    .filter((w) => w.length >= 3);
}

function matchArtistFromText(text, index, allArtists) {
  const n = norm(text);
  if (!n) return null;

  for (const [alias, artist] of Object.entries(OCR_ALIASES)) {
    if (artist && n.includes(alias)) return artist;
  }

  for (const { artist, n: needle } of index) {
    if (needle.length >= 4 && n.includes(needle)) return artist;
  }
  for (const { artist, n: needle } of index) {
    if (needle.length >= 3 && n.includes(needle)) return artist;
  }

  let best = null;
  let bestScore = 0;
  for (const artist of allArtists) {
    const words = artistWords(artist).filter((w) => w.length >= 4);
    if (!words.length) continue;
    const matched = words.filter((w) => n.includes(w));
    const score = matched.length / words.length;
    if (words.length === 1 && matched.length === 1 && words[0].length >= 6 && !GENERIC_WORDS.has(words[0])) return artist;
    if (words.length >= 2 && matched.length >= 2 && score >= 0.5) return artist;
    if (matched.length === words.length && words.length >= 2) return artist;
    if (score > bestScore && matched.length >= 2) {
      bestScore = score;
      best = artist;
    }
  }
  if (best && bestScore >= 0.66) return best;
  return null;
}

async function ocrArtistName(worker, buf) {
  const meta = await sharp(buf).metadata();
  const h = meta.height ?? 800;
  const w = meta.width ?? 600;

  const regions = [
    { left: 0, top: Math.floor(h * 0.42), width: w, height: Math.floor(h * 0.38) },
    { left: Math.floor(w * 0.35), top: Math.floor(h * 0.15), width: Math.floor(w * 0.6), height: Math.floor(h * 0.55) },
    { left: 0, top: Math.floor(h * 0.55), width: w, height: Math.floor(h * 0.3) },
    { left: 0, top: 0, width: w, height: h },
  ];

  const texts = [];
  for (const box of regions) {
    const crop = await sharp(buf)
      .extract(box)
      .resize(1800, null, { withoutEnlargement: true })
      .grayscale()
      .normalize()
      .threshold(145)
      .png()
      .toBuffer();
    const { data } = await worker.recognize(crop);
    if (data.text?.trim()) texts.push(data.text);
  }
  return texts.join('\n');
}

async function optimizeAndSave(input, outPath) {
  const output = await sharp(input, { animated: false })
    .rotate()
    .resize(PRESET.width, PRESET.height, { fit: 'cover', position: 'centre' })
    .webp({ quality: PRESET.quality, effort: 4 })
    .toBuffer();
  await writeFile(outPath, output);
}

async function main() {
  const content = JSON.parse(readFileSync(join(root, 'cms', 'seed', 'content.json'), 'utf8'));
  const allArtists = [...new Set([...content.schedule.map((s) => s.artist), ...content.autographs.map((a) => a.artist)])];
  const artistIndex = buildArtistIndex(allArtists);

  const urls = await fetchFestImageUrls();
  console.log(`Fest images to analyze: ${urls.length}`);

  mkdirSync(CACHE_DIR, { recursive: true });
  mkdirSync(ASSETS_DIR, { recursive: true });
  mkdirSync(UPLOADS_DIR, { recursive: true });

  const worker = await createWorker('rus+eng');
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });

  const urlToArtist = new Map();
  const report = [];

  for (const url of urls) {
    const file = url.split('/').pop();
    let artist = artistFromFilename(url);
    let method = artist ? 'filename' : null;
    let ocrText = '';

    const cachePath = cachePathForUrl(url);
    let buf;
    try {
      buf = Buffer.from(await fetch(url).then((r) => r.arrayBuffer()));
      await writeFile(cachePath, buf);
    } catch (e) {
      report.push({ url, file, error: String(e) });
      continue;
    }

    if (!artist) {
      ocrText = await ocrArtistName(worker, buf);
      artist = matchArtistFromText(ocrText, artistIndex, allArtists);
      if (artist && shouldRejectMatch(ocrText, artist)) artist = null;
      if (artist) method = 'ocr';
    }

    report.push({ url, file, artist, method, ocrPreview: ocrText.slice(0, 200).replace(/\s+/g, ' ') });

    if (!artist) continue;

    const existing = urlToArtist.get(url);
    if (!existing) {
      urlToArtist.set(url, artist);
    }
  }

  await worker.terminate();

  // one image per artist — keep first confident match
  const artistToUrl = new Map();
  const duplicates = [];
  for (const [url, artist] of urlToArtist) {
    if (artistToUrl.has(artist)) {
      duplicates.push({ artist, kept: artistToUrl.get(artist), skipped: url });
      continue;
    }
    artistToUrl.set(artist, url);
  }

  const artists = {};
  const assetEntries = [];
  const usedSlugs = new Set();

  for (const [artist, url] of artistToUrl) {
    const baseSlug = slugify(artist);
    let slug = baseSlug;
    let i = 2;
    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${i++}`;
    }
    usedSlugs.add(slug);

    const cacheFile = cachePathForUrl(url);
    const assetFile = join(ASSETS_DIR, `${slug}.webp`);
    const uploadFile = join(UPLOADS_DIR, `${slug}.webp`);

    const buf = readFileSync(cacheFile);
    await optimizeAndSave(buf, assetFile);
    await optimizeAndSave(buf, uploadFile);

    const uploadUrl = `/api/uploads/images/${slug}.webp`;
    artists[artist] = uploadUrl;
    assetEntries.push({ artist, slug, assetFile: `../../assets/images/artists/${slug}.webp` });
  }

  // aliases for schedule variants
  const aliasMap = {
    ГОРШЕНЕВ: 'ГОРШЕНЕВА',
    'RADIO ТАРО': 'RADIO TAPOK',
    RAVANNA: 'РАВАННА / RAVANNA',
    SELLOUT: 'СЕЛЛАУТ / SELLOUT',
    МЕЩЕРАА: 'МЕЩЕРА',
    'РАЗНЫЕ ЛЮДИ, МУХОМОРЫ': 'МУХОМОРЫ',
    'КОСТЯ КУЛЯСОВ': 'КОСТЯ КУЛЯСОВ. АНИМАЦИЯ',
    POLNALYUBVI: 'ПОЛНАЛЮБВИ / POLNALYUBVI',
    'ПОЛНАЛЮБВИ': 'ПОЛНАЛЮБВИ / POLNALYUBVI',
    'ВИА ВОЛГА-ВОЛГА': 'ВИА «ВОЛГА-ВОЛГА»',
  };
  for (const [from, to] of Object.entries(aliasMap)) {
    if (artists[to] && !artists[from]) artists[from] = artists[to];
  }

  writeFileSync(SOURCES_PATH, JSON.stringify({ source: 'https://uletayfest.ru/', artists }, null, 2) + '\n');

  const tsLines = [
    '// Generated by scripts/sync-fest-artist-images.mjs — do not edit',
    '',
    'export const festArtistAssets: Record<string, number> = {',
    ...assetEntries.map(({ artist, assetFile }) => `  ${JSON.stringify(artist)}: require('${assetFile}'),`),
    '};',
    '',
  ];
  writeFileSync(GENERATED_TS, tsLines.join('\n'));

  writeFileSync(
    REPORT_PATH,
    JSON.stringify(
      {
        totalUrls: urls.length,
        matched: artistToUrl.size,
        duplicates,
        unmatched: report.filter((r) => !r.artist),
        report,
      },
      null,
      2,
    ) + '\n',
  );

  const matchedSchedule = allArtists.filter((a) => artists[a]);
  console.log(`Matched ${artistToUrl.size} images, ${matchedSchedule.length}/${allArtists.length} schedule artists`);
  console.log(`Assets: ${ASSETS_DIR}`);
  console.log(`Uploads: ${UPLOADS_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
