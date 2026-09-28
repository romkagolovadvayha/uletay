'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Headliner } from '@/types';
import type { HeadlinerLastFmProfile } from '@/lastfm-types';
import { runHeadlinerRefreshBatch, type RefreshArtist, type RefreshProgress } from '@/lib/headliner-refresh-batch';
import { refreshHeadlinerMusicAction } from '../actions';
import { useContentRevision, useUpdateContentRevision } from './ContentRevision';
import { useEditorDirty } from './EditorForm';

export function useHeadlinerMusicRefresh() {
  const revision = useContentRevision();
  const updateRevision = useUpdateContentRevision();
  const [busy, setBusy] = useState(false);
  const [stopRequested, setStopRequested] = useState(false);
  const [progress, setProgress] = useState<RefreshProgress | null>(null);
  const [profiles, setProfiles] = useState<Record<string, HeadlinerLastFmProfile>>({});
  const running = useRef(false);
  const cancelled = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; cancelled.current = true; };
  }, []);

  async function start(artists: RefreshArtist[]) {
    if (running.current || !artists.length) return;
    running.current = true;
    cancelled.current = false;
    setBusy(true);
    setStopRequested(false);
    try {
      await runHeadlinerRefreshBatch(artists, revision, {
        refresh: refreshHeadlinerMusicAction,
        isCancelled: () => cancelled.current,
        pause: () => new Promise((resolve) => setTimeout(resolve, 350)),
        onProgress: (next) => { if (mounted.current) setProgress(next); },
        onSuccess: (result) => {
          if (!mounted.current) return;
          updateRevision(result.revision);
          setProfiles((current) => ({
            ...current,
            ...Object.fromEntries(result.updatedIds.map((id) => [id, result.profile])),
          }));
        },
      });
    } finally {
      running.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  function stop() {
    cancelled.current = true;
    setStopRequested(true);
  }

  return { start, stop, busy, stopRequested, progress, profiles };
}

export function HeadlinerRefreshStatus({ refresh }: { refresh: ReturnType<typeof useHeadlinerMusicRefresh> }) {
  const { busy, progress, stopRequested, stop } = refresh;
  if (!progress) return null;
  return (
    <div className="music-refresh-status">
      <p role="status" aria-live="polite">
        {busy
          ? `Обработано ${progress.completed} из ${progress.total}.${progress.current ? ` Обновляем: ${progress.current}…` : ''}`
          : `${progress.stopped ? 'Обновление остановлено. ' : ''}Обновлено: ${progress.updated} из ${progress.total}.`}
      </p>
      {busy && <progress value={progress.completed} max={progress.total} aria-label="Обновление артистов" />}
      {busy && progress.total > 1 && (
        <button type="button" className="btn-secondary btn-sm" onClick={stop} disabled={stopRequested}>
          {stopRequested ? 'Останавливаем после текущего артиста…' : 'Остановить'}
        </button>
      )}
      {busy && progress.total > 1 && <p className="hint">Оставьте страницу открытой до завершения обновления.</p>}
      {progress.errors.length > 0 && (
        <ul className="error" role="alert">
          {progress.errors.map((error, index) => <li key={index}>{error}</li>)}
        </ul>
      )}
    </div>
  );
}

export function HeadlinerMusicRefresh({ artist }: { artist: Headliner }) {
  const refresh = useHeadlinerMusicRefresh();
  const dirty = useEditorDirty();
  const { pending } = useFormStatus();
  const profile = refresh.profiles[artist.id] ?? artist.lastfm;
  const updatedAt = profile?.updatedAt && Number.isFinite(Date.parse(profile.updatedAt))
    ? new Date(profile.updatedAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
    : null;

  return (
    <section className="music-refresh-panel span-2" aria-label="Музыкальные данные артиста">
      <h3>Музыкальные данные · Last.fm</h3>
      <p className="hint">Популярные песни, жанры, похожие артисты, биография и статистика слушателей.</p>
      <p className="hint">Учитываются дополнительные названия и связанные артисты. Фотография и описание карточки сохраняются.</p>
      <p className="hint">{updatedAt ? `Последнее обновление: ${updatedAt} (МСК)` : 'Данные ещё не загружены.'}</p>
      <button
        type="button"
        className="btn-secondary"
        disabled={refresh.busy || dirty || pending}
        aria-busy={refresh.busy}
        onClick={() => void refresh.start([artist])}
      >
        {refresh.busy ? 'Обновляем данные…' : 'Обновить данные артиста'}
      </button>
      {dirty && <p className="hint">Сначала сохраните изменения карточки.</p>}
      <HeadlinerRefreshStatus refresh={refresh} />
      {profile && (
        <details className="music-refresh-preview">
          <summary>Песни в приложении ({profile.topTracks.length})</summary>
          {profile.topTracks.length ? (
            <ol>{profile.topTracks.map((track, index) => <li key={index}>{track.name}</li>)}</ol>
          ) : <p className="hint">Last.fm пока не вернул песни для этого артиста.</p>}
        </details>
      )}
    </section>
  );
}
