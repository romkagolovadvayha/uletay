import React, { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { RadioNowPlaying } from '../api/radioNowPlayingApi';
import { RADIO_STATION_NAME, RADIO_STREAM_URL } from '../config/radio';
import { SchedulePerformance, Headliner } from '../types';

export type RadioAudioEngineProps = {
  engineRef: React.MutableRefObject<{ play: () => void; pause: () => void } | null>;
  pendingPlayRef: React.MutableRefObject<boolean>;
  onPlaybackChange: (state: { playing: boolean; isBuffering: boolean }) => void;
  nowPlaying: RadioNowPlaying | null;
  matchedPerformance: SchedulePerformance | null;
  matchedHeadliner: Headliner | null;
};

export function RadioAudioEngine({
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
