import { Image } from 'expo-image';
import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { ExternalLink } from './ExternalLink';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import {
  buildYandexMusicArtistSearchUrl,
  buildYandexMusicSearchUrl,
} from '../utils/yandexMusic';

const YANDEX_MUSIC_LOGO = require('../../assets/images/yandex-music-logo.webp');

type Props = {
  artist: string;
  track?: string;
  variant?: 'icon' | 'listen';
  size?: number;
};

export function YandexMusicLink({ artist, track, variant = 'icon', size = 32 }: Props) {
  const url = useMemo(
    () =>
      track
        ? buildYandexMusicSearchUrl(artist, track)
        : buildYandexMusicArtistSearchUrl(artist),
    [artist, track],
  );

  const accessibilityLabel = track
    ? `Открыть «${track}» в Яндекс Музыке`
    : `Слушать ${artist} в Яндекс Музыке`;

  if (variant === 'listen') {
    return (
      <ExternalLink
        href={url}
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [styles.listenTarget, pressed && styles.pressed]}
      >
        <View style={styles.listenButton}>
          <View style={styles.listenRow}>
            <Text style={styles.listenLabel} numberOfLines={1}>
              Слушать в
            </Text>
            <Image
              source={YANDEX_MUSIC_LOGO}
              style={styles.listenLogo}
              contentFit="contain"
              accessibilityLabel=""
              alt=""
              accessibilityIgnoresInvertColors
            />
            <Text style={styles.listenBrand} numberOfLines={1}>
              Яндекс Музыка
            </Text>
          </View>
        </View>
      </ExternalLink>
    );
  }

  const targetSize = Math.max(44, size);
  const targetMargin = (size - targetSize) / 2;

  return (
    <ExternalLink
      href={url}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.iconTarget,
        {
          width: targetSize,
          height: targetSize,
          marginHorizontal: targetMargin,
          marginVertical: targetMargin,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconButton, { width: size, height: size, borderRadius: radius.sm }]}>
        <Image
          source={YANDEX_MUSIC_LOGO}
          style={{ width: size - 4, height: size - 4 }}
          contentFit="contain"
          accessibilityLabel=""
          alt=""
          accessibilityIgnoresInvertColors
        />
      </View>
    </ExternalLink>
  );
}

const styles = StyleSheet.create({
  iconTarget: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: colors.surfaceGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  listenTarget: {
    alignSelf: 'center',
    minHeight: 44,
    marginTop: -3,
    marginBottom: spacing.lg - 3,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  listenButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: 'transparent',
    maxWidth: '100%',
    ...(Platform.OS === 'web' ? { whiteSpace: 'nowrap' as never } : null),
  },
  listenRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  listenLabel: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
    textTransform: 'none',
    letterSpacing: 0,
    flexShrink: 0,
  },
  listenLogo: {
    width: 22,
    height: 22,
    flexShrink: 0,
  },
  listenBrand: {
    ...typography.body,
    color: colors.text,
    fontSize: 13,
    textTransform: 'none',
    letterSpacing: 0,
    flexShrink: 0,
  },
  pressed: {
    opacity: 0.72,
  },
});
