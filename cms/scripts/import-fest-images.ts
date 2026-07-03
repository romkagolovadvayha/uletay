import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getAppData, saveAppData } from '../src/lib/app-data';
import type { AppData } from '../src/types';

type SourcesFile = {
  source: string;
  artists: Record<string, string>;
};

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const force = args.has('--force');

async function loadSources(): Promise<Record<string, string>> {
  const sourcesPath = path.resolve(__dirname, '../../scripts/fest-artist-sources.json');
  const raw = await readFile(sourcesPath, 'utf8');
  const parsed = JSON.parse(raw) as SourcesFile;
  return parsed.artists;
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
  const artistToUrl = new Map(Object.entries(sources));

  console.log(`Artists in sources: ${artistToUrl.size}`);
  console.log(`Mode: apply local /api/uploads paths${dryRun ? ', dry-run' : ''}${force ? ', force' : ', only missing'}`);
  console.log('Run "npm run fest:sync-images" first if uploads are empty.');

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
