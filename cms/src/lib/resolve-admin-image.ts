import { existsSync } from 'node:fs';
import path from 'node:path';
import { config } from './config';
import { lookupFestArtistAssetUrl } from './fest-artist-sources';
import { festAssetUrl, repoAssetsDir } from './repo-assets';

function resolveUploadUrl(url: string): string {
  const match = url.match(/^\/api\/uploads\/images\/(.+)$/);
  if (!match?.[1]) return url;

  const filename = match[1];
  const uploadPath = path.join(config.uploadDir, 'images', filename);
  if (existsSync(uploadPath)) return url;

  const assetPath = path.join(repoAssetsDir, 'images', 'artists', filename);
  if (existsSync(assetPath)) {
    return festAssetUrl('images', 'artists', filename);
  }

  return url;
}

export function resolveAdminImageSrc(
  imageUrl?: string | null,
  artist?: string | null,
): string | undefined {
  const trimmed = imageUrl?.trim();
  if (trimmed) {
    return resolveUploadUrl(trimmed);
  }

  return lookupFestArtistAssetUrl(artist);
}

export function resolveAdminFestivalHeroSrc(heroImageUrl?: string | null): string {
  const trimmed = heroImageUrl?.trim();
  if (trimmed) return resolveUploadUrl(trimmed);
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
    return resolveUploadUrl(trimmed);
  }
  return festAssetUrl('images', 'festival-logo.png');
}
