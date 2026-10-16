import type { HeadlinerLastFmProfile } from '@/lastfm-types';
import { AppDataConflictError, getAppData, saveAppData } from './app-data';
import { getHeadlinerGroup } from './headliner-groups';
import { resolveAndMergeLastFmForHeadliner } from './headliner-lastfm-sync';
import { assertLastFmConfigured } from './lastfm';

export type HeadlinerRefreshResult =
  | { ok: true; revision: string; updatedIds: string[]; profile: HeadlinerLastFmProfile }
  | { ok: false; error: string; stopBatch: boolean };

const defaults = {
  getAppData,
  saveAppData,
  resolveProfile: resolveAndMergeLastFmForHeadliner,
  assertConfigured: assertLastFmConfigured,
};

// One linked group per request: the browser runs larger selections sequentially.
export async function refreshHeadlinerMusic(
  id: string,
  revision: string | undefined,
  dependencies = defaults,
): Promise<HeadlinerRefreshResult> {
  if (typeof id !== 'string' || !id.trim()) {
    return { ok: false, error: 'Выберите артиста.', stopBatch: true };
  }
  try {
    dependencies.assertConfigured();
  } catch {
    return { ok: false, error: 'Для обновления нужен ключ Last.fm API в настройках сервера.', stopBatch: true };
  }

  try {
    const data = await dependencies.getAppData();
    if (!revision || data.revision !== revision) throw new AppDataConflictError();
    const headliner = data.headliners.find((item) => item.id === id);
    if (!headliner) {
      return { ok: false, error: 'Артист не найден. Обновите страницу.', stopBatch: true };
    }

    let profile: HeadlinerLastFmProfile | null | undefined;
    try {
      // A service error must not turn a partially fetched group into a successful update.
      profile = await dependencies.resolveProfile(headliner, data.headliners, { strict: true });
    } catch {
      return { ok: false, error: 'Last.fm не ответил или отклонил запрос. Повторите позже; при повторной ошибке проверьте ключ API и подключение сервера.', stopBatch: true };
    }
    if (!profile) {
      return { ok: false, error: 'Данные в Last.fm не найдены. Проверьте имя и дополнительные названия артиста.', stopBatch: false };
    }

    const group = getHeadlinerGroup(data.headliners, id);
    // Replace all cached copies, otherwise the public API can merge old songs back in.
    for (const member of group) member.lastfm = profile;
    await dependencies.saveAppData(data);
    return { ok: true, revision: data.revision!, updatedIds: group.map((item) => item.id), profile };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof AppDataConflictError
        ? error.message
        : 'Не удалось сохранить музыкальные данные. Повторите попытку.',
      stopBatch: true,
    };
  }
}
