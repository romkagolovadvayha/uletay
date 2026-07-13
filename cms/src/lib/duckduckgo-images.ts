import sharp from 'sharp';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const SQUARE_RATIO_MIN = 0.85;
const SQUARE_RATIO_MAX = 1.15;
const MIN_IMAGE_EDGE = 180;
const MAX_TRANSPARENT_PIXEL_RATIO = 0.01;
const ALPHA_OPAQUE_THRESHOLD = 245;

export type DuckDuckGoImageResult = {
  image: string;
  title?: string;
  source?: string;
  width?: number;
  height?: number;
};

export function buildMusicCoverSearchQueries(artistName: string): string[] {
  const primary = artistName.split('/')[0].trim();
  if (!primary) {
    return [];
  }

  return [
    `группа музыкальная ${primary} лого квадрат`,
    `музыкальная группа ${primary} лого квадрат`,
    `${primary} группа музыкальная лого`,
    `${primary} лого квадрат`,
    `${primary} лого`,
  ];
}

function isRoughlySquare(width?: number, height?: number): boolean {
  if (!width || !height || width < MIN_IMAGE_EDGE || height < MIN_IMAGE_EDGE) {
    return false;
  }

  const ratio = width / height;
  return ratio >= SQUARE_RATIO_MIN && ratio <= SQUARE_RATIO_MAX;
}

async function isOpaqueSquareImage(buffer: Buffer): Promise<boolean> {
  const metadata = await sharp(buffer, { animated: false }).metadata();
  if (!isRoughlySquare(metadata.width, metadata.height)) {
    return false;
  }

  if (!metadata.hasAlpha) {
    return true;
  }

  const { data, info } = await sharp(buffer, { animated: false })
    .resize(96, 96, { fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels < 4) {
    return true;
  }

  const totalPixels = info.width * info.height;
  let transparentPixels = 0;

  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < ALPHA_OPAQUE_THRESHOLD) {
      transparentPixels += 1;
    }
  }

  return transparentPixels / totalPixels <= MAX_TRANSPARENT_PIXEL_RATIO;
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
  const candidates = results
    .filter((result) => {
      const imageUrl = result.image?.trim();
      if (!imageUrl?.startsWith('http')) {
        return false;
      }

      if (result.width && result.height) {
        return isRoughlySquare(result.width, result.height);
      }

      return true;
    })
    .slice(0, 24);

  for (const result of candidates) {
    const imageUrl = result.image.trim();

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

      if (!(await isOpaqueSquareImage(buffer))) {
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
