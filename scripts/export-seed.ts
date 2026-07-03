import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { defaultAppData } from '../src/storage/dataStore';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'cms', 'seed');
mkdirSync(outDir, { recursive: true });

const withDefaults = {
  ...defaultAppData,
  festival: {
    ...defaultAppData.festival,
    heroImageUrl: null,
    logoImageUrl: null,
  },
  stages: defaultAppData.stages.map((stage) => ({
    ...stage,
    color:
      stage.id === 'south'
        ? '#F5C518'
        : stage.id === 'west'
          ? '#34C759'
          : '#FF5520',
  })),
};

writeFileSync(join(outDir, 'content.json'), JSON.stringify(withDefaults, null, 2), 'utf8');
console.log('Exported cms/seed/content.json');
