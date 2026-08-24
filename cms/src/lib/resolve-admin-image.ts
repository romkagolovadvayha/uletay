import { existsSync } from 'node:fs';
import path from 'node:path';
import foodcourtSeed from '../../seed/foodcourt.json';
import { config } from './config';
import {
  lookupFestArtistAssetUrl,
  lookupFestArtistUploadUrl,
} from './fest-artist-sources';
import { festAssetUrl, repoAssetsDir } from './repo-assets';

function resolveUploadUrl(url: string): string | undefined {
  const match = url.match(/^\/api\/uploads\/images\/(.+)$/);
  if (!match?.[1]) return url;

  const filename = match[1];
  const uploadPath = path.join(config.uploadDir, 'images', filename);
  if (existsSync(uploadPath)) return url;

  const assetPath = path.join(repoAssetsDir, 'images', 'artists', filename);
  if (existsSync(assetPath)) {
    return festAssetUrl('images', 'artists', filename);
  }

  return undefined;
}

const foodcourtFallbackById = new Map(
  foodcourtSeed.map((item) => [item.id, item.imageUrl] as const),
);

export function resolveAdminImageSrc(
  imageUrl?: string | null,
  artist?: string | null,
): string | undefined {
  const trimmed = imageUrl?.trim();
  if (trimmed) {
    const resolved = resolveUploadUrl(trimmed);
    if (resolved) return resolved;
  }

  const artistUpload = lookupFestArtistUploadUrl(artist);
  if (artistUpload) {
    const resolved = resolveUploadUrl(artistUpload);
    if (resolved) return resolved;
  }

  return lookupFestArtistAssetUrl(artist);
}

export function resolveAdminFoodcourtImageSrc(
  imageUrl?: string | null,
  vendorId?: string | null,
): string | undefined {
  const trimmed = imageUrl?.trim();
  if (trimmed) {
    const resolved = resolveUploadUrl(trimmed);
    if (resolved) return resolved;
  }

  const fallback = vendorId ? foodcourtFallbackById.get(vendorId) : undefined;
  return fallback ? resolveUploadUrl(fallback) : undefined;
}

export function resolveAdminFestivalHeroSrc(heroImageUrl?: string | null): string {
  const trimmed = heroImageUrl?.trim();
  if (trimmed) {
    const resolved = resolveUploadUrl(trimmed);
    if (resolved) return resolved;
  }
  return festAssetUrl('images', 'hero-crowd.png');
}

export function resolveAdminFestivalLogoSrc(logoImageUrl?: string | null): string {
  const trimmed = logoImageUrl?.trim();
  if (trimmed) {
    const match = trimmed.match(/^\/api\/uploads\/images\/(.+)$/);
    if (match?.[1]) {
      const uploadPath = path.join(config.uploadDir, 'images', match[1]);
      if (!existsSync(uploadPath)) {
        return festAssetUrl('images', 'festival-logo.png');
      }
    }
    return resolveUploadUrl(trimmed) ?? festAssetUrl('images', 'festival-logo.png');
  }
  return festAssetUrl('images', 'festival-logo.png');
}
