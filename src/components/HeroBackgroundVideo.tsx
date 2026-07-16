import { useFocusEffect } from '@react-navigation/native';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useCallback, useEffect } from 'react';
import { Platform, StyleSheet, type ViewStyle } from 'react-native';

const HERO_VIDEO_ASPECT_RATIO = 16 / 9;
const HERO_VIDEO_SOURCE = require('../../assets/videos/background.mp4');

type HeroBackgroundVideoProps = {
  onReady: () => void;
};

export function HeroBackgroundVideo({ onReady }: HeroBackgroundVideoProps) {
  const heroPlayer = useVideoPlayer(HERO_VIDEO_SOURCE, (player) => {
    player.loop = true;
    player.muted = true;
    if (Platform.OS === 'ios') {
      player.allowsExternalPlayback = false;
    }
    player.play();
  });

  useEffect(() => {
    const playingListener = heroPlayer.addListener('playingChange', ({ isPlaying }) => {
      if (isPlaying) {
        onReady();
      }
    });
    const statusListener = heroPlayer.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') {
        heroPlayer.play();
      }
    });

    heroPlayer.play();

    return () => {
      playingListener.remove();
      statusListener.remove();
    };
  }, [heroPlayer, onReady]);

  useFocusEffect(
    useCallback(() => {
      try {
        heroPlayer.play();
      } catch {
        // Player may already be released during tab transitions.
      }
      return () => {
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
