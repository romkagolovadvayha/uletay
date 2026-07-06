import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { foodcourtVendors } from './foodcourt-data.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const contentPath = path.join(root, 'cms/seed/content.json');
const seedPath = path.join(root, 'cms/seed/foodcourt.json');
const tsPath = path.join(root, 'src/data/foodcourt.ts');

writeFileSync(seedPath, `${JSON.stringify(foodcourtVendors, null, 2)}\n`, 'utf8');

const content = JSON.parse(readFileSync(contentPath, 'utf8'));
content.foodcourt = foodcourtVendors;
writeFileSync(contentPath, `${JSON.stringify(content, null, 2)}\n`, 'utf8');

const ts = `import { FoodCourtVendor } from '../types';
import vendors from './foodcourtVendors.json';

export const foodCourtVendors: FoodCourtVendor[] = vendors;
`;

writeFileSync(path.join(root, 'src/data/foodcourtVendors.json'), `${JSON.stringify(foodcourtVendors, null, 2)}\n`, 'utf8');
writeFileSync(tsPath, ts, 'utf8');

console.log(`Synced ${foodcourtVendors.length} foodcourt vendors`);
