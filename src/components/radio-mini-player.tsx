import { NavigationProp, useNavigation, useNavigationState } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRadioPlayer } from '../context/RadioPlayerContext';
import { useIsTablet } from '../hooks/useIsTablet';
import { RootTabParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { appFont, typography } from '../theme/typography';

export function RadioMiniPlayer() {
  const navigation = useNavigation<NavigationProp<RootTabParamList>>();
  const activeTab = useNavigationState((state) => state.routes[state.index ?? 0]?.name);
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { width } = useWindowDimensions();
  const {
    isPlaying,
    isBuffering,
    isPlayerVisible,
    nowPlaying,
    matchedHeadliner,
    togglePlayback,
  } = useRadioPlayer();

  if (!isPlayerVisible || activeTab === 'PlaylistTab') {
    return null;
  }

  const artist = matchedHeadliner?.name || nowPlaying?.artist || 'Улетай радио';
  const title = nowPlaying?.title || (isBuffering ? 'Подключаемся к эфиру…' : 'Прямой эфир');
  const compactWidth = Math.min(420, width - spacing.xxl);

  return (
    <View
      style={[
        styles.position,
        { pointerEvents: 'box-none' },
        isTablet
          ? { right: spacing.xl, bottom: spacing.xl, width: compactWidth }
          : {
              left: spacing.md,
              right: spacing.md,
              bottom: 58 + insets.bottom,
            },
      ]}
    >
      <View style={styles.player}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Открыть фестивальное радио"
          onPress={() => navigation.navigate('PlaylistTab')}
          style={({ pressed }) => [styles.info, pressed && styles.pressed]}
        >
          <View style={styles.liveDot} />
          <View style={styles.copy}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {artist}
            </Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Пауза' : 'Слушать радио'}
          accessibilityState={{ busy: isBuffering }}
          onPress={togglePlayback}
          style={({ pressed }) => [styles.control, pressed && styles.controlPressed]}
        >
          {isBuffering && !isPlaying ? (
            <ActivityIndicator size="small" color={colors.primaryText} />
          ) : (
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={22}
              color={colors.primaryText}
            />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  position: {
    position: 'absolute',
    zIndex: 80,
  },
  player: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.42)',
  },
  info: {
    flex: 1,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.live,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...appFont('semiBold'),
    color: colors.text,
    fontSize: 13,
  },
  artist: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
  },
  control: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  controlPressed: {
    transform: [{ scale: 0.96 }],
  },
  pressed: {
    opacity: 0.86,
  },
});
