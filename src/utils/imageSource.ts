import { ImageSource } from 'expo-image';
import { resolveMediaUrl } from '../config/api';

export function getRemoteImageSource(
  url?: string | null,
  fallback?: number,
): ImageSource | number {
  const resolved = resolveMediaUrl(url);
  if (resolved) {
    return { uri: resolved };
  }
  if (fallback) {
    return fallback;
  }
  throw new Error('getRemoteImageSource: no image URL or fallback provided');
}
