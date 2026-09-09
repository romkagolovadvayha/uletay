import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Headliner } from '../types';
import { formatLastFmCount } from '../utils/lastfmFormat';
import { getHeadlinerDisplayAlternateNames } from '../utils/headlinerGroups';
import { ArtistImage } from './ArtistImage';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { MotionPressable } from './MotionPressable';

type Props = {
  headliner: Headliner;
  allHeadliners?: Headliner[];
  onPress?: () => void;
  large?: boolean;
  desktopTile?: boolean;
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

function DesktopHeadlinerTile({ headliner, onPress }: { headliner: Headliner; onPress?: () => void }) {
  const hover = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const cardMotion = useAnimatedStyle(() => ({
    transform: [
      { perspective: 950 },
      { translateY: reduceMotion ? 0 : interpolate(hover.value, [0, 1], [0, -10]) },
      { rotateX: `${reduceMotion ? 0 : interpolate(hover.value, [0, 1], [0, -2.5])}deg` },
      { rotateY: `${reduceMotion ? 0 : interpolate(hover.value, [0, 1], [0, 1.25])}deg` },
    ],
  }));
  const imageMotion = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : interpolate(hover.value, [0, 1], [1, 1.06]) }],
  }));
  const setHover = (active: boolean) => {
    // Reanimated shared values are intentionally mutable animation handles.
    // eslint-disable-next-line react-hooks/immutability
    hover.value = withTiming(active ? 1 : 0, {
      duration: active ? 420 : 240,
      easing: Easing.out(Easing.cubic),
    });
  };
  const genre = headliner.lastfm?.tags?.[0]?.name || headliner.description || 'Рок-сцена';
  const latestYear = Math.max(...headliner.years);

  return (
    <Animated.View style={[styles.desktopTileMotion, cardMotion]}>
      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel={`Открыть артиста ${headliner.name}`}
        onPress={onPress}
        onHoverIn={() => setHover(true)}
        onHoverOut={() => setHover(false)}
        style={styles.desktopTile}
      >
        <View style={styles.desktopImageCrop}>
          <Animated.View style={[StyleSheet.absoluteFill, imageMotion]}>
            <ArtistImage
              imageUrl={headliner.imageUrl}
              artist={headliner.name}
              alt=""
              variant="hero"
              style={styles.desktopImage}
            />
          </Animated.View>
          <LinearGradient
            colors={['rgba(11,13,11,0.02)', 'rgba(11,13,11,0.18)', 'rgba(11,13,11,0.96)']}
            locations={[0, 0.52, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.desktopYearPill}>
            <Text style={styles.desktopYearText}>{Number.isFinite(latestYear) ? latestYear : 'УЛЕТАЙ'}</Text>
          </View>
          <View style={styles.desktopCopy}>
            <Text style={styles.desktopName} numberOfLines={2}>{headliner.name}</Text>
            <Text style={styles.desktopGenre} numberOfLines={1}>{genre}</Text>
          </View>
        </View>
      </MotionPressable>
    </Animated.View>
  );
}

export function HeadlinerCard({ headliner, allHeadliners, onPress, large, desktopTile }: Props) {
  if (desktopTile) {
    return <DesktopHeadlinerTile headliner={headliner} onPress={onPress} />;
  }

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
    <MotionPressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.card}
    >
      <HeadlinerThumbnail headliner={headliner} />
      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={2}>
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
    </MotionPressable>
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
  content: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    flexShrink: 1,
    minWidth: 0,
  },
  name: {
    ...typography.artistName,
    color: colors.text,
    fontSize: 14,
    flexShrink: 1,
  },
  nameSeparator: {
    display: 'none',
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
  desktopTileMotion: {
    flex: 1,
    minWidth: 0,
    marginBottom: 18,
  },
  desktopTile: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    boxShadow: '0 22px 52px rgba(0,0,0,0.28)',
  } as ViewStyle,
  desktopImageCrop: {
    position: 'relative',
    height: 330,
    overflow: 'hidden',
    borderRadius: 18,
  },
  desktopImage: {
    width: '100%',
    height: '100%',
  },
  desktopYearPill: {
    position: 'absolute',
    top: 15,
    left: 15,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
    backgroundColor: 'rgba(11,13,11,0.72)',
  },
  desktopYearText: {
    ...typography.caption,
    color: colors.text,
    fontSize: 8,
    letterSpacing: 1,
  },
  desktopCopy: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
  },
  desktopName: {
    ...typography.artistName,
    color: colors.text,
    fontSize: 19,
    lineHeight: 23,
  },
  desktopGenre: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 6,
    textTransform: 'capitalize',
  },
});
