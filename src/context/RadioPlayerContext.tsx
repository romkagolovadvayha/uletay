import React, {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { fetchRadioNowPlaying, RadioNowPlaying } from '../api/radioNowPlayingApi';
import { useAppData } from './DataContext';
import { RADIO_NOW_PLAYING_POLL_MS } from '../config/radio';
import { SchedulePerformance, Headliner } from '../types';
import {
  findHeadlinerByRadioArtist,
  findSchedulePerformanceByRadioArtist,
} from '../utils/matchRadioArtist';
import { useNow } from '../hooks/useNow';

type RadioPlayerContextValue = {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  nowPlaying: RadioNowPlaying | null;
  matchedPerformance: SchedulePerformance | null;
  matchedHeadliner: Headliner | null;
  togglePlayback: () => void;
  play: () => void;
  pause: () => void;
  refreshNowPlaying: () => Promise<void>;
  setPlaylistActive: (active: boolean) => void;
};

const RadioPlayerContext = createContext<RadioPlayerContextValue | undefined>(undefined);

const LazyRadioAudioEngine = React.lazy(() =>
  import('./RadioAudioEngine').then((m) => ({ default: m.RadioAudioEngine })),
);

export function RadioPlayerProvider({ children }: { children: React.ReactNode }) {
  const { data } = useAppData();
  const now = useNow(30_000);
  const [nowPlaying, setNowPlaying] = useState<RadioNowPlaying | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMetadataLoading, setIsMetadataLoading] = useState(false);
  const [playlistActive, setPlaylistActive] = useState(false);
  const [audioMounted, setAudioMounted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const engineRef = useRef<{ play: () => void; pause: () => void } | null>(null);
  const pendingPlayRef = useRef(false);

  const matchedPerformance = useMemo(
    () =>
      nowPlaying
        ? findSchedulePerformanceByRadioArtist(
            data.schedule,
            nowPlaying.artist,
            nowPlaying.title,
            now,
          )
        : null,
    [data.schedule, now, nowPlaying],
  );

  const matchedHeadliner = useMemo(
    () =>
      nowPlaying && !matchedPerformance
        ? findHeadlinerByRadioArtist(data.headliners, nowPlaying.artist, nowPlaying.title)
        : null,
    [data.headliners, matchedPerformance, nowPlaying],
  );

  const refreshNowPlaying = useCallback(async () => {
    setIsMetadataLoading(true);
    try {
      const next = await fetchRadioNowPlaying();
      setNowPlaying(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось получить эфир');
    } finally {
      setIsMetadataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!playlistActive) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void refreshNowPlaying();
    }, 0);
    const intervalId = setInterval(() => {
      void refreshNowPlaying();
    }, RADIO_NOW_PLAYING_POLL_MS);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [playlistActive, refreshNowPlaying]);

  const handlePlaybackChange = useCallback(
    (state: { playing: boolean; isBuffering: boolean }) => {
      setIsPlaying(state.playing);
      setIsBuffering(state.isBuffering);
    },
    [],
  );

  const play = useCallback(() => {
    setError(null);
    if (!audioMounted) {
      pendingPlayRef.current = true;
      setAudioMounted(true);
      return;
    }
    engineRef.current?.play();
  }, [audioMounted]);

  const pause = useCallback(() => {
    pendingPlayRef.current = false;
    engineRef.current?.pause();
  }, []);

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      pause();
      return;
    }
    play();
  }, [isPlaying, pause, play]);

  const value = useMemo(
    () => ({
      isPlaying,
      isLoading: isBuffering || isMetadataLoading,
      error,
      nowPlaying,
      matchedPerformance,
      matchedHeadliner,
      togglePlayback,
      play,
      pause,
      refreshNowPlaying,
      setPlaylistActive,
    }),
    [
      error,
      isBuffering,
      isMetadataLoading,
      isPlaying,
      matchedHeadliner,
      matchedPerformance,
      nowPlaying,
      pause,
      play,
      refreshNowPlaying,
      togglePlayback,
    ],
  );

  return (
    <RadioPlayerContext.Provider value={value}>
      {audioMounted ? (
        <Suspense fallback={null}>
          <LazyRadioAudioEngine
            engineRef={engineRef}
            pendingPlayRef={pendingPlayRef}
            onPlaybackChange={handlePlaybackChange}
            nowPlaying={nowPlaying}
            matchedPerformance={matchedPerformance}
            matchedHeadliner={matchedHeadliner}
          />
        </Suspense>
      ) : null}
      {children}
    </RadioPlayerContext.Provider>
  );
}

export function useRadioPlayer() {
  const context = useContext(RadioPlayerContext);
  if (!context) {
    throw new Error('useRadioPlayer must be used within RadioPlayerProvider');
  }
  return context;
}
