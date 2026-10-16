import type { HeadlinerRefreshResult } from './headliner-refresh';

export type RefreshArtist = { id: string; name: string };
export type RefreshProgress = {
  total: number;
  completed: number;
  updated: number;
  errors: string[];
  current?: string;
  stopped?: boolean;
};

export async function runHeadlinerRefreshBatch(
  artists: RefreshArtist[],
  revision: string | undefined,
  options: {
    refresh: (id: string, revision?: string) => Promise<HeadlinerRefreshResult>;
    onSuccess: (result: Extract<HeadlinerRefreshResult, { ok: true }>) => void;
    onProgress: (progress: RefreshProgress) => void;
    isCancelled: () => boolean;
    pause: () => Promise<void>;
  },
): Promise<void> {
  const unique = [...new Map(artists.map((artist) => [artist.id, artist])).values()];
  const updated = new Set<string>();
  const failed = new Set<string>();
  const errors: string[] = [];
  const report = (current?: string, stopped = false) => options.onProgress({
    total: unique.length,
    completed: unique.filter((artist) => updated.has(artist.id) || failed.has(artist.id)).length,
    updated: unique.filter((artist) => updated.has(artist.id)).length,
    errors: [...errors],
    current,
    stopped,
  });

  let stopped = false;
  for (const artist of unique) {
    if (updated.has(artist.id)) continue;
    if (options.isCancelled()) { stopped = true; break; }
    report(artist.name);
    let result: HeadlinerRefreshResult;
    try {
      result = await options.refresh(artist.id, revision);
    } catch {
      result = { ok: false, error: 'Связь с сервером прервана. Обновите страницу перед повторной попыткой.', stopBatch: true };
    }
    if (result.ok) {
      revision = result.revision;
      result.updatedIds.forEach((id) => updated.add(id));
      options.onSuccess(result);
    } else {
      failed.add(artist.id);
      errors.push(`${artist.name}: ${result.error}`);
      if (result.stopBatch) { stopped = true; break; }
    }
    report();
    if (unique.some((item) => !updated.has(item.id) && !failed.has(item.id))) await options.pause();
  }
  report(undefined, stopped);
}
