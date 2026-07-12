import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { fetchRadioNowPlaying, RadioNowPlaying } from '../api/radioNowPlayingApi';
import { useAppData } from './DataContext';
import { RADIO_NOW_PLAYING_POLL_MS, RADIO_STATION_NAME, RADIO_STREAM_URL } from '../config/radio';
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

type RadioAudioEngineProps = {
  engineRef: React.MutableRefObject<{ play: () => void; pause: () => void } | null>;
  pendingPlayRef: React.MutableRefObject<boolean>;
  onPlaybackChange: (state: { playing: boolean; isBuffering: boolean }) => void;
  nowPlaying: RadioNowPlaying | null;
  matchedPerformance: SchedulePerformance | null;
  matchedHeadliner: Headliner | null;
};

const RadioPlayerContext = createContext<RadioPlayerContextValue | undefined>(undefined);

function RadioAudioEngine({
  engineRef,
  pendingPlayRef,
  onPlaybackChange,
  nowPlaying,
  matchedPerformance,
  matchedHeadliner,
}: RadioAudioEngineProps) {
  const player = useAudioPlayer({ uri: RADIO_STREAM_URL });
  const status = useAudioPlayerStatus(player);
  const lockScreenActiveRef = useRef(false);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
  }, []);

  useEffect(() => {
    engineRef.current = {
      play: () => {
        player.play();
      },
      pause: () => {
        player.pause();
      },
    };

    if (pendingPlayRef.current) {
      pendingPlayRef.current = false;
      player.play();
    }

    return () => {
      engineRef.current = null;
    };
  }, [engineRef, pendingPlayRef, player]);

  useEffect(() => {
    onPlaybackChange({
      playing: status.playing,
      isBuffering: status.isBuffering,
    });
  }, [onPlaybackChange, status.isBuffering, status.playing]);

  useEffect(() => {
    if (Platform.OS === 'web' || !status.playing) {
      return;
    }

    player.setActiveForLockScreen(true, {
      title: nowPlaying?.title || RADIO_STATION_NAME,
      artist: nowPlaying?.artist || RADIO_STATION_NAME,
      albumTitle: RADIO_STATION_NAME,
      artworkUrl: matchedPerformance?.imageUrl ?? matchedHeadliner?.imageUrl,
    });
    lockScreenActiveRef.current = true;
  }, [
    matchedHeadliner?.imageUrl,
    matchedPerformance?.imageUrl,
    nowPlaying?.artist,
    nowPlaying?.title,
    player,
    status.playing,
  ]);

  const pauseForLockScreen = useCallback(() => {
    if (Platform.OS === 'web' || !lockScreenActiveRef.current) {
      return;
    }
    player.setActiveForLockScreen(false);
    lockScreenActiveRef.current = false;
  }, [player]);

  useEffect(() => {
    if (!status.playing) {
      pauseForLockScreen();
    }
  }, [pauseForLockScreen, status.playing]);

  return null;
}

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
        <RadioAudioEngine
          engineRef={engineRef}
          pendingPlayRef={pendingPlayRef}
          onPlaybackChange={handlePlaybackChange}
          nowPlaying={nowPlaying}
          matchedPerformance={matchedPerformance}
          matchedHeadliner={matchedHeadliner}
        />
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
