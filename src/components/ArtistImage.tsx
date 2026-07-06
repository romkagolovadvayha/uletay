import { Ionicons } from '@expo/vector-icons';
import { Image, ImageStyle } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { resolveArtistImageSource } from '../utils/festArtistImages';

type Props = {
  imageUrl?: string | null;
  artist?: string | null;
  style?: StyleProp<ImageStyle>;
  contentFit?: 'cover' | 'contain';
  variant?: 'thumbnail' | 'hero';
};

export function ArtistImage({ imageUrl, artist, style, contentFit = 'cover', variant = 'thumbnail' }: Props) {
  const source = resolveArtistImageSource(imageUrl, artist);
  const iconSize = variant === 'hero' ? 72 : 32;

  if (source) {
    return <Image source={source} style={style} contentFit={contentFit} />;
  }

  return (
    <LinearGradient
      colors={['#2A2A2C', '#141414']}
      style={[styles.placeholder, style as StyleProp<ViewStyle>]}
    >
      <Ionicons
        name="musical-notes"
        size={iconSize}
        color={variant === 'hero' ? 'rgba(255, 193, 7, 0.45)' : colors.primary}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceCard,
  },
});
