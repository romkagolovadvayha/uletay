export type ArtistShareResult = 'shared' | 'cancelled' | 'insecure' | 'unsupported' | 'failed';
type ShareEnvironment = { share?: (data: ShareData) => Promise<void>; secure: boolean };

export function buildArtistShareData(name: string, currentUrl: string): ShareData {
  const url = new URL(currentUrl);
  url.search = '';
  url.hash = '';
  return { title: name, url: url.href };
}

/** Invoke immediately from the click so the browser keeps transient user activation. */
export async function openArtistShare(data: ShareData, environment: ShareEnvironment): Promise<ArtistShareResult> {
  if (!environment.share) return environment.secure ? 'unsupported' : 'insecure';
  try {
    await environment.share(data);
    return 'shared';
  } catch (error) {
    return (error as { name?: string })?.name === 'AbortError' ? 'cancelled' : 'failed';
  }
}
