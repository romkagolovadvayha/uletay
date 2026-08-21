import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Headliner } from '../types';
import { formatLastFmCount } from '../utils/lastfmFormat';
import { getHeadlinerDisplayAlternateNames } from '../utils/headlinerGroups';
import { ArtistImage } from './ArtistImage';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = {
  headliner: Headliner;
  allHeadliners?: Headliner[];
  onPress?: () => void;
  large?: boolean;
};

const MINI_THUMB_SIZE = 52;

function formatHeadlinerStatsLine(headliner: Headliner): string | null {
  const lastfm = headliner.lastfm;
  const listeners = lastfm?.listeners;
  const playcount = lastfm?.playcount;

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

export function HeadlinerCard({ headliner, allHeadliners, onPress, large }: Props) {
  if (large) {
    return (
      <View style={styles.heroWrap}>
        <HeadlinerThumbnail headliner={headliner} large />
      </View>
    );
  }

  const statsLine = formatHeadlinerStatsLine(headliner);
  const alternateNames = getHeadlinerDisplayAlternateNames(headliner);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <HeadlinerThumbnail headliner={headliner} />
      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {headliner.name.toUpperCase()}
          </Text>
          {alternateNames.length ? (
            <>
              <Text style={styles.nameSeparator}>·</Text>
              <Text style={styles.alternateNames} numberOfLines={1}>
                {alternateNames.join(' · ')}
              </Text>
            </>
          ) : null}
        </View>
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
    backgroundColor: colors.surfaceGlass,
    borderRadius: radius.xl,
  },
  pressed: {
    opacity: 0.9,
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
  },
  name: {
    ...typography.artistName,
    color: colors.text,
    fontSize: 14,
    flexShrink: 0,
  },
  nameSeparator: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 14,
    marginLeft: spacing.sm,
    marginRight: spacing.xs,
  },
  alternateNames: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 14,
    textTransform: 'none',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  stats: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 14,
    textTransform: 'none',
    letterSpacing: 0,
  },
  heroWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
});
