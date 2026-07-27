import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { mapColors } from '../../theme/map';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { resolveAndroidBottomInset } from '../../utils/safeArea';
import { useMapMotion } from './MapMotionConfig';

type Props = {
  visible: boolean;
  children: React.ReactNode;
  onClose?: () => void;
};

export function MapPoiPopup({ visible, children, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { reduceMotion } = useMapMotion();
  const translateY = useSharedValue(320);

  useEffect(() => {
    translateY.value = reduceMotion
      ? visible
        ? 0
        : 320
      : withSpring(visible ? 0 : 320, { damping: 22, stiffness: 220 });
  }, [visible, reduceMotion, translateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[styles.wrap, { pointerEvents: 'box-none' }, sheetStyle]}
    >
      <View
        style={[
          styles.sheet,
          { paddingBottom: resolveAndroidBottomInset(insets.bottom) + spacing.md },
        ]}
      >
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
          {onClose ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Закрыть карточку"
              onPress={onClose}
              hitSlop={8}
              style={styles.close}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.content}>{children}</View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
  },
  sheet: {
    backgroundColor: mapColors.sheetBg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
  },
  handleWrap: {
    position: 'relative',
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  close: {
    position: 'absolute',
    right: spacing.screen,
    top: spacing.sm,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: mapColors.handle,
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.sm,
  },
});
