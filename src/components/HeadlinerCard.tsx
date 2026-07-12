import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Headliner } from '../types';
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

function HeadlinerThumbnail({ headliner, large }: { headliner: Headliner; large?: boolean }) {
  const size = large ? 220 : 72;

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
        <Text style={styles.description} numberOfLines={2}>
          {headliner.description}
        </Text>
        <Text style={styles.year}>{headliner.year}</Text>
      </View>
    </Pressable>
  );
}

export { HeadlinerThumbnail };

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
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
  description: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  year: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    textTransform: 'none',
    letterSpacing: 0,
    marginTop: 4,
  },
  heroWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
});
