import React, { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import type { AudioMetadata } from 'expo-audio';
import { RadioNowPlaying } from '../api/radioNowPlayingApi';
import { resolveMediaUrl } from '../config/api';
import { RADIO_STATION_NAME, RADIO_STREAM_URL } from '../config/radio';
import { Headliner } from '../types';

const LOCK_SCREEN_OPTIONS = {
  isLiveStream: true,
  showSeekForward: false,
  showSeekBackward: false,
} as const;

function resolveLockScreenArtworkUrl(path?: string | null): string | undefined {
  const resolved = resolveMediaUrl(path);
  if (!resolved) {
    return undefined;
  }
  if (!resolved.startsWith('http://') && !resolved.startsWith('https://')) {
    return undefined;
  }
  try {
    // Native Android URL parser rejects relative paths and non-ASCII without encoding.
    return encodeURI(resolved);
  } catch {
    return undefined;
  }
}

function buildLockScreenMetadata(
  nowPlaying: RadioNowPlaying | null,
  matchedHeadliner: Headliner | null,
): AudioMetadata {
  const metadata: AudioMetadata = {
    title: nowPlaying?.title || 'В эфире',
    artist: matchedHeadliner?.name || nowPlaying?.artist || RADIO_STATION_NAME,
    albumTitle: RADIO_STATION_NAME,
  };

  const artworkUrl = resolveLockScreenArtworkUrl(matchedHeadliner?.imageUrl);
  if (artworkUrl) {
    metadata.artworkUrl = artworkUrl;
  }

  return metadata;
}

export type RadioAudioEngineProps = {
  engineRef: React.MutableRefObject<{ play: () => void; pause: () => void } | null>;
  pendingPlayRef: React.MutableRefObject<boolean>;
  onPlaybackChange: (state: {
    playing: boolean;
    isBuffering: boolean;
    error: string | null;
  }) => void;
  nowPlaying: RadioNowPlaying | null;
  matchedHeadliner: Headliner | null;
};

export function RadioAudioEngine({
  engineRef,
  pendingPlayRef,
  onPlaybackChange,
  nowPlaying,
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
      error: status.error,
    });
  }, [onPlaybackChange, status.error, status.isBuffering, status.playing]);

  useEffect(() => {
    if (Platform.OS === 'web' || !status.playing) {
      return;
    }

    const metadata = buildLockScreenMetadata(nowPlaying, matchedHeadliner);

    try {
      if (lockScreenActiveRef.current) {
        player.updateLockScreenMetadata(metadata);
      } else {
        player.setActiveForLockScreen(true, metadata, LOCK_SCREEN_OPTIONS);
        lockScreenActiveRef.current = true;
      }
    } catch (err) {
      console.warn('[RadioAudioEngine] lock screen metadata failed', err);
      // Retry without artwork — relative/invalid artworkUrl previously crashed the app.
      try {
        const { artworkUrl: _artworkUrl, ...withoutArtwork } = metadata;
        if (lockScreenActiveRef.current) {
          player.updateLockScreenMetadata(withoutArtwork);
        } else {
          player.setActiveForLockScreen(true, withoutArtwork, LOCK_SCREEN_OPTIONS);
          lockScreenActiveRef.current = true;
        }
      } catch (retryErr) {
        console.warn('[RadioAudioEngine] lock screen activate failed', retryErr);
      }
    }
  }, [matchedHeadliner, nowPlaying, player, status.playing]);

  const pauseForLockScreen = useCallback(() => {
    if (Platform.OS === 'web' || !lockScreenActiveRef.current) {
      return;
    }
    try {
      player.setActiveForLockScreen(false);
    } catch (err) {
      console.warn('[RadioAudioEngine] lock screen deactivate failed', err);
    }
    lockScreenActiveRef.current = false;
  }, [player]);

  useEffect(() => {
    if (!status.playing) {
      pauseForLockScreen();
    }
  }, [pauseForLockScreen, status.playing]);

  return null;
}
