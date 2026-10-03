import { readFileSync } from 'node:fs';
import type { AppData } from '../src/types';
import {
  decodeSeoRouteId,
  encodeSeoRouteId,
  festivalEndDateTime,
} from '../src/seo/seoRouteUtils';
import { buildWebStructuredData } from '../src/seo/structuredData';
import { resolveSeoMeta } from '../src/seo/routeSeo';
import { DEFAULT_SOCIAL_IMAGE_URL } from '../src/seo/site';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`check-seo-utils: ${message}`);
  }
}

const encodedId = encodeSeoRouteId('artist/F.P.G.');
assert(encodedId === 'artist~2FF~2EP~2EG~2E', 'unsafe route id was not escaped');
assert(decodeSeoRouteId(encodedId) === 'artist/F.P.G.', 'route id did not round-trip');
assert(
  festivalEndDateTime('2026-07-10', '23:30', '00:30') ===
    '2026-07-11T00:30:00+04:00',
  'overnight event did not roll over to the next day',
);

const data = JSON.parse(
  readFileSync(new URL('../cms/seed/content.json', import.meta.url), 'utf8'),
) as AppData;
const otava = data.headliners.find((item) => item.id === 'hl-отава-ё');
assert(otava, 'known image regression fixture is missing');
const lumen = data.headliners.find((item) => item.id === 'hl-lumen');
assert(lumen, 'LUMEN SEO regression fixture is missing');

const lumenMeta = resolveSeoMeta(
  {
    routes: [{ name: 'HeadlinerDetail', params: { headlinerId: lumen.id } }],
    index: 0,
  },
  data,
);
for (const year of [2027, 2026]) {
  const meta = resolveSeoMeta(
    { routes: [{ name: 'HeadlinersMain', params: { year: String(year) } }], index: 0 },
    data,
  );
  assert(meta.path === `/headliners/${year}`, `year ${year} has wrong path`);
  assert(meta.title.startsWith(`Хедлайнеры ${year}`), `year ${year} has wrong title`);
  assert(!meta.noIndex, `year ${year} is not indexable`);
}
assert(lumenMeta.path === '/headliners/hl-lumen', 'indexed artist URL changed');
assert(lumenMeta.description.startsWith('LUMEN —'), 'artist name is missing from description');
assert(
  lumenMeta.description.includes('фестиваля УЛЕТАЙ'),
  'festival context is missing from description',
);
assert(
  !lumenMeta.description.includes('There are several artists'),
  'untrusted Last.fm biography leaked into description',
);
assert(lumenMeta.description.length <= 160, 'artist description exceeds 160 characters');

const withBrokenImage: AppData = {
  ...data,
  headliners: data.headliners.map((item) =>
    item.id === otava.id
      ? { ...item, imageUrl: 'https://broken.example/otava.webp' }
      : item,
  ),
};
const jsonLd = buildWebStructuredData(
  {
    title: 'Отава Ё',
    siteName: 'УЛЕТАЙ',
    description: 'Страница артиста',
    path: '/headliners/hl-отава-ё',
  },
  withBrokenImage,
);
const graph = jsonLd['@graph'];
assert(Array.isArray(graph), 'JSON-LD graph is missing');
const artist = graph.find(
  (node) => typeof node === 'object' && node?.['@type'] === 'MusicGroup',
);
assert(artist?.image === DEFAULT_SOCIAL_IMAGE_URL, 'known broken schema image was advertised');

console.log('check-seo-utils: route ids, dates, artist metadata and image fallback passed');
