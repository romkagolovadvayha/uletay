import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { getAppData, saveAppData } from '../src/lib/app-data';
import { config } from '../src/lib/config';
import { IMAGE_PRESETS } from '../src/lib/image-presets';
import type { AppData } from '../src/types';

type SourcesFile = {
  source: string;
  artists: Record<string, string>;
};

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const force = args.has('--force');
const externalOnly = args.has('--external');

async function loadSources(): Promise<Record<string, string>> {
  const sourcesPath = path.resolve(__dirname, '../../scripts/fest-artist-sources.json');
  const raw = await readFile(sourcesPath, 'utf8');
  const parsed = JSON.parse(raw) as SourcesFile;
  return parsed.artists;
}

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function saveArtistImage(sourceUrl: string): Promise<string> {
  const input = await downloadImage(sourceUrl);
  const { width, height } = IMAGE_PRESETS.artist;
  const output = await sharp(input, { animated: false })
    .rotate()
    .resize(width, height, { fit: 'cover', position: 'centre' })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  const targetDir = path.join(config.uploadDir, 'images');
  await mkdir(targetDir, { recursive: true });

  const filename = `fest_${Date.now()}_${Math.random().toString(36).slice(2)}.webp`;
  const targetPath = path.join(targetDir, filename);
  await writeFile(targetPath, output);
  return `${config.uploadUrl}/images/${filename}`;
}

function applyImages(data: AppData, artistToUrl: Map<string, string>, onlyMissing: boolean): AppData {
  return {
    ...data,
    schedule: data.schedule.map((item) => {
      const url = artistToUrl.get(item.artist);
      if (!url) return item;
      if (onlyMissing && item.imageUrl) return item;
      return { ...item, imageUrl: url };
    }),
    autographs: data.autographs.map((item) => {
      const url = artistToUrl.get(item.artist);
      if (!url) return item;
      if (onlyMissing && item.imageUrl) return item;
      return { ...item, imageUrl: url };
    }),
  };
}

async function main() {
  const sources = await loadSources();
  const artistToUrl = new Map<string, string>();
  const sourceToLocal = new Map<string, string>();

  const uniqueSources = [...new Set(Object.values(sources))];
  console.log(`Sources: ${Object.keys(sources).length} artists, ${uniqueSources.length} unique images`);
  console.log(`Mode: ${externalOnly ? 'external URLs' : 'download to uploads'}${dryRun ? ', dry-run' : ''}${force ? ', force' : ', only missing'}`);

  for (const sourceUrl of uniqueSources) {
    if (externalOnly) {
      sourceToLocal.set(sourceUrl, sourceUrl);
      continue;
    }
    if (dryRun) {
      sourceToLocal.set(sourceUrl, `[dry-run] ${sourceUrl}`);
      continue;
    }
    const localUrl = await saveArtistImage(sourceUrl);
    sourceToLocal.set(sourceUrl, localUrl);
    console.log(`  ${sourceUrl.split('/').pop()} -> ${localUrl}`);
  }

  for (const [artist, sourceUrl] of Object.entries(sources)) {
    artistToUrl.set(artist, sourceToLocal.get(sourceUrl) ?? sourceUrl);
  }

  const data = await getAppData();
  const updated = applyImages(data, artistToUrl, !force);

  const scheduleUpdated = updated.schedule.filter((item, i) => item.imageUrl !== data.schedule[i]?.imageUrl).length;
  const autographsUpdated = updated.autographs.filter((item, i) => item.imageUrl !== data.autographs[i]?.imageUrl).length;

  console.log(`Schedule rows updated: ${scheduleUpdated}`);
  console.log(`Autograph rows updated: ${autographsUpdated}`);

  if (!dryRun) {
    await saveAppData(updated);
    console.log('Saved to database');
  }
}

main().catch((error) => {
  console.error('Import failed:', error);
  process.exit(1);
});
