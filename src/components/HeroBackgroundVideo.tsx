import { useFocusEffect } from '@react-navigation/native';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useCallback, useEffect, useRef } from 'react';
import { Platform, StyleSheet, type ViewStyle } from 'react-native';

const HERO_VIDEO_ASPECT_RATIO = 16 / 9;
/** WebM is slightly smaller and typically decodes faster in Chromium. */
const HERO_VIDEO_SOURCE =
  Platform.OS === 'web'
    ? require('../../assets/videos/background.webm')
    : require('../../assets/videos/background.mp4');

type HeroBackgroundVideoProps = {
  onReady: () => void;
};

export function HeroBackgroundVideo({ onReady }: HeroBackgroundVideoProps) {
  const shouldPlayRef = useRef(false);
  const heroPlayer = useVideoPlayer(HERO_VIDEO_SOURCE, (player) => {
    player.loop = true;
    player.muted = true;
    if (Platform.OS === 'ios') {
      player.allowsExternalPlayback = false;
    }
  });

  useEffect(() => {
    const playingListener = heroPlayer.addListener('playingChange', ({ isPlaying }) => {
      if (isPlaying) {
        if (!shouldPlayRef.current) {
          heroPlayer.pause();
          return;
        }
        onReady();
      }
    });
    return () => {
      playingListener.remove();
    };
  }, [heroPlayer, onReady]);

  useFocusEffect(
    useCallback(() => {
      shouldPlayRef.current = true;
      try {
        heroPlayer.play();
      } catch {
        // Player may already be released during tab transitions.
      }
      return () => {
        shouldPlayRef.current = false;
        // On web, pausing while HTMLMediaElement.play() is still pending creates
        // an unhandled AbortError inside expo-video. If playback has not started,
        // the playingChange listener above pauses it immediately after it resolves.
        if (Platform.OS === 'web' && !heroPlayer.playing) {
          return;
        }
        try {
          heroPlayer.pause();
        } catch {
          // Player may already be released during tab transitions.
        }
      };
    }, [heroPlayer]),
  );

  return (
    <VideoView
      style={[
        styles.parallaxVideoMedia,
        Platform.OS === 'web' ? styles.parallaxVideoMediaWeb : null,
      ]}
      player={heroPlayer}
      contentFit="cover"
      nativeControls={false}
      playsInline
      useExoShutter={false}
      allowsPictureInPicture={false}
      startsPictureInPictureAutomatically={false}
      surfaceType={Platform.OS === 'android' ? 'textureView' : undefined}
      onFirstFrameRender={onReady}
    />
  );
}

const styles = StyleSheet.create({
  parallaxVideoMedia: {
    height: '100%',
    aspectRatio: HERO_VIDEO_ASPECT_RATIO,
    minWidth: '100%',
  },
  parallaxVideoMediaWeb: {
    objectPosition: 'center center',
  } as ViewStyle,
});
