import type { AppData } from '../types';
import { saveAppData } from './app-data';
import { sendPushBroadcast, validatePushBroadcast, type PushSendResult } from './push';
import { encodeSeoRouteId } from '../../../src/seo/seoRouteUtils';

export type ArtistAnnouncementResult = {
  status: 'announced' | 'already' | 'warning';
  message: string;
  result?: PushSendResult;
};

type Dependencies = {
  save: typeof saveAppData;
  broadcast: typeof sendPushBroadcast;
};

/** The catalog revision is the announcement lock: only the successful writer sends. */
export async function saveArtistAndAnnounce(
  data: AppData,
  artistId: string,
  adminId: number,
  previouslyParticipating: boolean,
  dependencies: Dependencies = { save: saveAppData, broadcast: sendPushBroadcast },
): Promise<ArtistAnnouncementResult> {
  const artist = data.headliners.find(item => item.id === artistId);
  if (!artist) throw new Error('Артист не найден');
  const year = data.festival.year;
  const payload = validatePushBroadcast({
    title: `Новый артист на Улетай ${year}`,
    body: `${artist.name} приедет на фестиваль! Откройте карточку артиста.`,
    targetPath: `/headliners/${encodeSeoRouteId(artist.id)}`,
    audience: 'all',
  });
  artist.years = [...new Set([...artist.years, year])].sort((a, b) => b - a);
  // No push on failed validation, a stale editor or a concurrent double click.
  await dependencies.save(data);
  if (previouslyParticipating) return {
    status: 'already', message: `Артист уже в лайн-апе ${year}. Повторное уведомление не отправлено.`,
  };
  try {
    const result = await dependencies.broadcast(payload, adminId);
    const accepted = result.nativeAccepted + result.webSent;
    const failed = result.nativeFailed + result.webFailed;
    return {
      status: failed || result.errors.length ? 'warning' : 'announced',
      message: `Артист добавлен в лайн-ап ${year}. Пуш: принято ${accepted}, ошибок ${failed}.` +
        (failed || result.errors.length ? ' Подробности в разделе Push-уведомления.' : accepted ? '' : ' Активных подписок пока нет.'),
      result,
    };
  } catch {
    // The lineup is already saved. Do not repeat a possibly partly delivered broadcast.
    return {
      status: 'warning',
      message: `Артист добавлен в лайн-ап ${year}, но рассылку не удалось завершить. Проверьте раздел Push-уведомления.`,
    };
  }
}
