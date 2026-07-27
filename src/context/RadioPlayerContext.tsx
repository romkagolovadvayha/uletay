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
import { Headliner } from '../types';
import { findHeadlinerByRadioArtist } from '../utils/matchRadioArtist';

type RadioPlayerContextValue = {
  isPlaying: boolean;
  isLoading: boolean;
  isBuffering: boolean;
  isMetadataLoading: boolean;
  isPlayerVisible: boolean;
  error: string | null;
  lastUpdatedAt: number | null;
  nowPlaying: RadioNowPlaying | null;
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
  const [nowPlaying, setNowPlaying] = useState<RadioNowPlaying | null>(null);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [isMetadataLoading, setIsMetadataLoading] = useState(false);
  const [playlistActive, setPlaylistActive] = useState(false);
  const [audioMounted, setAudioMounted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const engineRef = useRef<{ play: () => void; pause: () => void } | null>(null);
  const pendingPlayRef = useRef(false);

  const matchedHeadliner = useMemo(
    () =>
      nowPlaying
        ? findHeadlinerByRadioArtist(data.headliners, nowPlaying.artist, nowPlaying.title)
        : null,
    [data.headliners, nowPlaying],
  );

  const refreshNowPlaying = useCallback(async () => {
    setIsMetadataLoading(true);
    try {
      const next = await fetchRadioNowPlaying();
      setNowPlaying(next);
      setMetadataError(null);
      setLastUpdatedAt(Date.now());
    } catch {
      setMetadataError('Не удалось обновить информацию об эфире');
    } finally {
      setIsMetadataLoading(false);
    }
  }, []);

  useEffect(() => {
    // Poll while the playlist screen is open or radio is playing (for lock-screen metadata).
    if (!playlistActive && !isPlaying) {
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
  }, [playlistActive, isPlaying, refreshNowPlaying]);

  const handlePlaybackChange = useCallback(
    (state: { playing: boolean; isBuffering: boolean; error: string | null }) => {
      setIsPlaying(state.playing);
      setIsBuffering(state.isBuffering);
      setPlaybackError(
        state.error ? 'Не удалось подключиться к эфиру. Проверьте интернет и повторите.' : null,
      );
    },
    [],
  );

  const play = useCallback(() => {
    setPlaybackError(null);
    void refreshNowPlaying();
    if (!audioMounted) {
      pendingPlayRef.current = true;
      setAudioMounted(true);
      return;
    }
    engineRef.current?.play();
  }, [audioMounted, refreshNowPlaying]);

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
      isLoading: isBuffering,
      isBuffering,
      isMetadataLoading,
      isPlayerVisible: audioMounted,
      error: playbackError ?? metadataError,
      lastUpdatedAt,
      nowPlaying,
      matchedHeadliner,
      togglePlayback,
      play,
      pause,
      refreshNowPlaying,
      setPlaylistActive,
    }),
    [
      audioMounted,
      isBuffering,
      isMetadataLoading,
      isPlaying,
      lastUpdatedAt,
      matchedHeadliner,
      metadataError,
      nowPlaying,
      pause,
      play,
      playbackError,
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
