import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Dynamic import of compiled data via ts - use register for ts
// Instead read via spawning tsc output - simpler: import from built json path

// We import by evaluating the TS modules through a small inline approach:
// Run: npx tsx scripts/export-seed.ts would be better

console.log('Use: npx tsx scripts/export-seed.ts');
