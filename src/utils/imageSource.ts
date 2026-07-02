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
  return fallback ?? require('../../assets/images/artist-nadi.png');
}
