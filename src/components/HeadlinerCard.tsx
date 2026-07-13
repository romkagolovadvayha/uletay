import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Headliner } from '../types';
import { formatLastFmCount } from '../utils/lastfmFormat';
import { ArtistImage } from './ArtistImage';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = {
  headliner: Headliner;
  onPress?: () => void;
  large?: boolean;
};

const MINI_THUMB_SIZE = 52;

function formatHeadlinerStatsLine(headliner: Headliner): string | null {
  const listeners = headliner.lastfm?.listeners;
  const playcount = headliner.lastfm?.playcount;

  if (!listeners && !playcount) {
    return null;
  }

  const parts: string[] = [];
  if (listeners) {
    parts.push(`${formatLastFmCount(listeners)} слушателей`);
  }
  if (playcount) {
    parts.push(`${formatLastFmCount(playcount)} прослушиваний`);
  }

  return parts.join(' · ');
}

function HeadlinerThumbnail({ headliner, large }: { headliner: Headliner; large?: boolean }) {
  const size = large ? 220 : MINI_THUMB_SIZE;

  return (
    <ArtistImage
      imageUrl={headliner.imageUrl}
      artist={headliner.name}
      style={{ width: size, height: size, borderRadius: large ? radius.xl : radius.md }}
      variant={large ? 'hero' : 'thumbnail'}
    />
  );
}

export function HeadlinerCard({ headliner, onPress, large }: Props) {
  if (large) {
    return (
      <View style={styles.heroWrap}>
        <HeadlinerThumbnail headliner={headliner} large />
      </View>
    );
  }

  const statsLine = formatHeadlinerStatsLine(headliner);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <HeadlinerThumbnail headliner={headliner} />
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {headliner.name.toUpperCase()}
        </Text>
        {statsLine ? (
          <Text style={styles.stats} numberOfLines={1}>
            {statsLine}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export { HeadlinerThumbnail };

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.9,
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  name: {
    ...typography.artistName,
    color: colors.text,
    fontSize: 14,
  },
  stats: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 14,
    textTransform: 'none',
    letterSpacing: 0,
  },
  heroWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
});
