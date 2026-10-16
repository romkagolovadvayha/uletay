import { Image, ImageStyle } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { Platform, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { DeferredIonicons } from './DeferredIonicons';
import { colors } from '../theme/colors';
import { buildArtistImageSourceChain } from '../utils/festArtistImages';

type Props = {
  imageUrl?: string | null;
  artist?: string | null;
  /** Web `alt` / screen-reader label. Defaults to artist name; pass `""` when decorative. */
  alt?: string;
  style?: StyleProp<ImageStyle>;
  contentFit?: 'cover' | 'contain';
  variant?: 'thumbnail' | 'hero';
};

export function ArtistImage({
  imageUrl,
  artist,
  alt,
  style,
  contentFit = 'cover',
  variant = 'thumbnail',
}: Props) {
  const chainKey = `${imageUrl ?? ''}\0${artist ?? ''}\0${variant}`;

  return (
    <ArtistImageResolved
      key={chainKey}
      imageUrl={imageUrl}
      artist={artist}
      alt={alt}
      style={style}
      contentFit={contentFit}
      variant={variant}
    />
  );
}

function ArtistImageResolved({
  imageUrl,
  artist,
  alt,
  style,
  contentFit = 'cover',
  variant = 'thumbnail',
}: Props) {
  const preferList = variant === 'thumbnail';
  const chain = useMemo(
    () => buildArtistImageSourceChain(imageUrl, artist, { preferList }),
    [imageUrl, artist, preferList],
  );
  const [index, setIndex] = useState(0);
  const iconSize = variant === 'hero' ? 72 : 32;
  const source = index < chain.length ? chain[index] : undefined;
  const imageAlt = alt ?? artist?.trim() ?? '';

  if (source) {
    return (
      <Image
        source={source}
        style={style}
        contentFit={contentFit}
        allowDownscaling
        cachePolicy="disk"
        decodeFormat={preferList ? 'rgb' : 'argb'}
        recyclingKey={`${imageUrl ?? artist ?? 'artist'}:${index}`}
        accessibilityLabel={imageAlt}
        alt={imageAlt}
        priority={preferList ? 'low' : 'high'}
        loading={Platform.OS === 'web' ? (preferList ? 'lazy' : 'eager') : undefined}
        onError={() => setIndex((current) => current + 1)}
      />
    );
  }

  return (
    <LinearGradient
      colors={[colors.fallbackGradientStart, colors.fallbackGradientEnd]}
      style={[styles.placeholder, style as StyleProp<ViewStyle>]}
    >
      <DeferredIonicons
        name="musical-notes"
        size={iconSize}
        color={variant === 'hero' ? colors.primarySubtle : colors.primary}
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
