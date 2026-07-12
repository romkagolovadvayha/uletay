import path from 'node:path';

function resolveRepoAssetsDir(): string {
  const fromEnv = process.env.REPO_ASSETS_DIR?.trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }

  return path.resolve(process.cwd(), '..', 'assets');
}

export const repoAssetsDir = resolveRepoAssetsDir();

export function festAssetUrl(...segments: string[]): string {
  return `/api/fest-assets/${segments.join('/')}`;
}
