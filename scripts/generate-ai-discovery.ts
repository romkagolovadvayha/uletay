import { readFileSync } from 'node:fs';
import path from 'node:path';
import { writeAiDiscovery } from './ai-discovery';

writeAiDiscovery(JSON.parse(readFileSync('cms/seed/content.json', 'utf8')), path.resolve('public'));
console.log('Generated public llms.txt, ai-guide.md, AI Catalog and WebMCP descriptions.');
