const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export type DuckDuckGoImageResult = {
  image: string;
  title?: string;
  source?: string;
};

export function buildMusicCoverSearchQueries(artistName: string): string[] {
  const primary = artistName.split('/')[0].trim();
  if (!primary) {
    return [];
  }

  return [
    `${primary} обложка альбом музыка`,
    `${primary} музыка обложка`,
    `${primary} музыкант обложка`,
    `${primary} музыка`,
  ];
}

export async function searchDuckDuckGoImages(query: string): Promise<DuckDuckGoImageResult[]> {
  const encoded = encodeURIComponent(query);
  const page = await fetch(`https://duckduckgo.com/?q=${encoded}&iax=images&ia=images`, {
    headers: { 'User-Agent': USER_AGENT },
  }).then((response) => response.text());

  const vqdMatch = page.match(/vqd=["']?([\d-]+)/);
  if (!vqdMatch?.[1]) {
    return [];
  }

  const apiUrl =
    `https://duckduckgo.com/i.js?l=ru-ru&o=json&q=${encoded}` +
    `&vqd=${vqdMatch[1]}&f=,,,,,&p=1`;

  const data = (await fetch(apiUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      Referer: 'https://duckduckgo.com/',
    },
  }).then((response) => response.json())) as { results?: DuckDuckGoImageResult[] };

  return data.results ?? [];
}

export async function fetchFirstUsableImageUrl(
  results: DuckDuckGoImageResult[],
): Promise<{ imageUrl: string; title: string } | null> {
  for (const result of results.slice(0, 10)) {
    const imageUrl = result.image?.trim();
    if (!imageUrl?.startsWith('http')) {
      continue;
    }

    try {
      const response = await fetch(imageUrl, {
        headers: { 'User-Agent': USER_AGENT },
        redirect: 'follow',
      });
      if (!response.ok) {
        continue;
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('image') && !/\.(jpe?g|png|webp|gif)(\?|$)/i.test(imageUrl)) {
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 1500) {
        continue;
      }

      return {
        imageUrl,
        title: result.title?.trim() || '',
      };
    } catch {
      continue;
    }
  }

  return null;
}

export async function resolveMusicCoverImageUrl(names: string[]): Promise<{
  imageUrl: string;
  query: string;
  title: string;
} | null> {
  const uniqueNames = [...new Set(names.map((name) => name.trim()).filter(Boolean))];

  for (const name of uniqueNames) {
    const queries = buildMusicCoverSearchQueries(name);
    for (const query of queries) {
      const results = await searchDuckDuckGoImages(query);
      const picked = await fetchFirstUsableImageUrl(results);
      if (picked) {
        return {
          imageUrl: picked.imageUrl,
          query,
          title: picked.title,
        };
      }
    }
  }

  return null;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
