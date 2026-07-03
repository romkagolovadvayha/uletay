import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { fetchRadioNowPlaying, RadioNowPlaying } from '../api/radioNowPlayingApi';
import { useAppData } from './DataContext';
import { RADIO_NOW_PLAYING_POLL_MS, RADIO_STATION_NAME, RADIO_STREAM_URL } from '../config/radio';
import { SchedulePerformance } from '../types';
import { findSchedulePerformanceByRadioArtist } from '../utils/matchRadioArtist';

type RadioPlayerContextValue = {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  nowPlaying: RadioNowPlaying | null;
  matchedPerformance: SchedulePerformance | null;
  togglePlayback: () => void;
  play: () => void;
  pause: () => void;
  refreshNowPlaying: () => Promise<void>;
};

const RadioPlayerContext = createContext<RadioPlayerContextValue | undefined>(undefined);

export function RadioPlayerProvider({ children }: { children: React.ReactNode }) {
  const { data } = useAppData();
  const player = useAudioPlayer({ uri: RADIO_STREAM_URL });
  const status = useAudioPlayerStatus(player);
  const [nowPlaying, setNowPlaying] = useState<RadioNowPlaying | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMetadataLoading, setIsMetadataLoading] = useState(false);
  const lockScreenActiveRef = useRef(false);

  const matchedPerformance = useMemo(
    () =>
      nowPlaying
        ? findSchedulePerformanceByRadioArtist(data.schedule, nowPlaying.artist, nowPlaying.title)
        : null,
    [data.schedule, nowPlaying],
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
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
  }, []);

  useEffect(() => {
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
  }, [refreshNowPlaying]);

  const updateLockScreen = useCallback(
    (active: boolean) => {
      if (Platform.OS === 'web') {
        return;
      }

      if (active) {
        player.setActiveForLockScreen(true, {
          title: nowPlaying?.title || RADIO_STATION_NAME,
          artist: nowPlaying?.artist || RADIO_STATION_NAME,
          albumTitle: RADIO_STATION_NAME,
          artworkUrl: matchedPerformance?.imageUrl,
        });
        lockScreenActiveRef.current = true;
        return;
      }

      if (lockScreenActiveRef.current) {
        player.setActiveForLockScreen(false);
        lockScreenActiveRef.current = false;
      }
    },
    [matchedPerformance?.imageUrl, nowPlaying?.artist, nowPlaying?.title, player],
  );

  const play = useCallback(() => {
    setError(null);
    updateLockScreen(true);
    player.play();
  }, [player, updateLockScreen]);

  const pause = useCallback(() => {
    player.pause();
    updateLockScreen(false);
  }, [player, updateLockScreen]);

  const togglePlayback = useCallback(() => {
    if (status.playing) {
      pause();
      return;
    }
    play();
  }, [pause, play, status.playing]);

  useEffect(() => {
    if (!status.playing) {
      return;
    }
    updateLockScreen(true);
  }, [nowPlaying?.artist, nowPlaying?.title, matchedPerformance?.imageUrl, status.playing, updateLockScreen]);

  const value = useMemo(
    () => ({
      isPlaying: status.playing,
      isLoading: status.isBuffering || isMetadataLoading,
      error,
      nowPlaying,
      matchedPerformance,
      togglePlayback,
      play,
      pause,
      refreshNowPlaying,
    }),
    [
      error,
      isMetadataLoading,
      matchedPerformance,
      nowPlaying,
      pause,
      play,
      refreshNowPlaying,
      status.isBuffering,
      status.playing,
      togglePlayback,
    ],
  );

  return <RadioPlayerContext.Provider value={value}>{children}</RadioPlayerContext.Provider>;
}

export function useRadioPlayer() {
  const context = useContext(RadioPlayerContext);
  if (!context) {
    throw new Error('useRadioPlayer must be used within RadioPlayerProvider');
  }
  return context;
}
