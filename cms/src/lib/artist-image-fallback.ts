const MUSICBRAINZ_USER_AGENT = 'UletayFestApp/1.0 (+https://uletayapp.ru)';
const MUSICBRAINZ_REQUEST_GAP_MS = 1100;

let lastMusicBrainzRequestAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForMusicBrainzSlot(): Promise<void> {
  const elapsed = Date.now() - lastMusicBrainzRequestAt;
  if (elapsed < MUSICBRAINZ_REQUEST_GAP_MS) {
    await sleep(MUSICBRAINZ_REQUEST_GAP_MS - elapsed);
  }
  lastMusicBrainzRequestAt = Date.now();
}

async function fetchMusicBrainzJson<T>(url: string): Promise<T | null> {
  await waitForMusicBrainzSlot();

  const response = await fetch(url, {
    headers: {
      'User-Agent': MUSICBRAINZ_USER_AGENT,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
}

type MusicBrainzArtistSearch = {
  artists?: {
    id: string;
    name: string;
    score?: number;
  }[];
};

type MusicBrainzArtist = {
  relations?: {
    type: string;
    url?: {
      resource?: string;
    };
  }[];
};

type WikidataEntityResponse = {
  entities?: Record<
    string,
    {
      claims?: {
        P18?: {
          mainsnak?: {
            datavalue?: {
              value?: string;
            };
          };
        }[];
      };
    }
  >;
};

function normalizeArtistName(value: string): string {
  return value
    .toUpperCase()
    .replace(/Ё/g, 'Е')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildMusicBrainzSearchQueries(artistName: string): string[] {
  const queries = new Set<string>();
  const trimmed = artistName.trim();
  if (!trimmed) {
    return [];
  }

  queries.add(`artist:"${trimmed.replace(/"/g, '')}"`);

  const primary = trimmed.split('/')[0].trim();
  if (primary) {
    queries.add(`artist:"${primary.replace(/"/g, '')}"`);
  }

  return [...queries];
}

export async function searchMusicBrainzArtistMbid(artistName: string): Promise<string | null> {
  const target = normalizeArtistName(artistName);

  for (const query of buildMusicBrainzSearchQueries(artistName)) {
    const payload = await fetchMusicBrainzJson<MusicBrainzArtistSearch>(
      `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(query)}&fmt=json&limit=5`,
    );
    const artists = payload?.artists ?? [];
    if (!artists.length) {
      continue;
    }

    const exact = artists.find((artist) => normalizeArtistName(artist.name) === target);
    if (exact?.id) {
      return exact.id;
    }

    const sorted = [...artists].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    if (sorted[0]?.id) {
      return sorted[0].id;
    }
  }

  return null;
}

function extractWikidataQid(resource: string): string | null {
  const match = resource.match(/wikidata\.org\/wiki\/(Q\d+)/i);
  return match?.[1] ?? null;
}

function buildWikimediaImageUrl(fileName: string): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}`;
}

async function fetchWikidataImageUrl(qid: string): Promise<string | null> {
  const response = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, {
    headers: {
      'User-Agent': MUSICBRAINZ_USER_AGENT,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as WikidataEntityResponse;
  const fileName = payload.entities?.[qid]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  return fileName ? buildWikimediaImageUrl(fileName) : null;
}

export async function fetchArtistImageUrlViaMusicBrainz(
  mbid: string,
): Promise<string | null> {
  const artist = await fetchMusicBrainzJson<MusicBrainzArtist>(
    `https://musicbrainz.org/ws/2/artist/${encodeURIComponent(mbid)}?inc=url-rels&fmt=json`,
  );

  const wikidataResource = artist?.relations?.find((relation) => relation.type === 'wikidata')?.url
    ?.resource;
  if (!wikidataResource) {
    return null;
  }

  const qid = extractWikidataQid(wikidataResource);
  if (!qid) {
    return null;
  }

  return fetchWikidataImageUrl(qid);
}

export async function resolveArtistImageFallbackUrl(
  artistName: string,
  mbid?: string,
): Promise<string | null> {
  const resolvedMbid = mbid?.trim() || (await searchMusicBrainzArtistMbid(artistName));
  if (!resolvedMbid) {
    return null;
  }

  return fetchArtistImageUrlViaMusicBrainz(resolvedMbid);
}
