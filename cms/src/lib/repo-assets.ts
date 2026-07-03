import path from 'node:path';

export const repoAssetsDir = path.resolve(process.cwd(), '..', 'assets');

export function festAssetUrl(...segments: string[]): string {
  return `/api/fest-assets/${segments.join('/')}`;
}
