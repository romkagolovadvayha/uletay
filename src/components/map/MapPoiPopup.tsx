import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { mapColors } from '../../theme/map';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { resolveAndroidBottomInset } from '../../utils/safeArea';
import { useMapMotion } from './MapMotionConfig';
import { webKeyboardActivationProps } from '../../utils/webKeyboardActivation';

type Props = {
  visible: boolean;
  children: React.ReactNode;
  onClose?: () => void;
};

const SHEET_OFFSET = 24;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const EASE_SHEET = Easing.bezier(0.32, 0.72, 0, 1);

function project(velocity: number, decelerationRate = 0.998) {
  'worklet';
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  'worklet';
  return (
    (overshoot * dimension * constant) /
    (dimension + constant * Math.abs(overshoot))
  );
}

export function MapPoiPopup({ visible, children, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { reduceMotion } = useMapMotion();
  const progress = useSharedValue(visible ? 1 : 0);
  const dragY = useSharedValue(0);
  const dragStartY = useSharedValue(0);
  const sheetHeight = useSharedValue(1);
  const webHiddenProps = Platform.OS === 'web'
    ? ({ 'aria-hidden': !visible, inert: visible ? undefined : true } as const)
    : {};

  useEffect(() => {
    if (visible) {
      dragY.set(0);
      progress.set(
        withTiming(1, {
          duration: reduceMotion ? 160 : 220,
          easing: reduceMotion ? EASE_OUT : EASE_SHEET,
        }),
      );
      return;
    }

    progress.set(
      withTiming(0, {
        duration: reduceMotion ? 120 : 160,
        easing: EASE_OUT,
      }),
    );
  }, [dragY, progress, reduceMotion, visible]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(Boolean(onClose) && !reduceMotion)
        .activeOffsetY([-10, 10])
        .onStart(() => {
          dragStartY.set(dragY.get());
        })
        .onUpdate((event) => {
          const next = dragStartY.get() + event.translationY;
          dragY.set(
            next >= 0
              ? next
              : rubberband(next, Math.max(1, sheetHeight.get())),
          );
        })
        .onEnd((event) => {
          const height = Math.max(1, sheetHeight.get());
          const projected = dragY.get() + project(event.velocityY);

          if (projected > height * 0.4 && onClose) {
            scheduleOnRN(
              Haptics.impactAsync,
              Haptics.ImpactFeedbackStyle.Light,
            );
            dragY.set(
              withSpring(
                height,
                {
                  duration: 300,
                  dampingRatio: 1,
                  velocity: event.velocityY,
                  overshootClamping: true,
                },
                (finished) => {
                  if (finished) {
                    scheduleOnRN(onClose);
                  }
                },
              ),
            );
            return;
          }

          dragY.set(
            withSpring(0, {
              duration: 300,
              dampingRatio: 0.8,
              velocity: event.velocityY,
            }),
          );
          scheduleOnRN(
            Haptics.impactAsync,
            Haptics.ImpactFeedbackStyle.Light,
          );
        }),
    [dragStartY, dragY, onClose, reduceMotion, sheetHeight],
  );

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [
      {
        translateY:
          (reduceMotion ? 0 : (1 - progress.get()) * SHEET_OFFSET) +
          dragY.get(),
      },
    ],
  }));

  return (
    <Animated.View
      {...webHiddenProps}
      pointerEvents={visible ? 'box-none' : 'none'}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'yes' : 'no-hide-descendants'}
      style={[styles.wrap, sheetStyle]}
    >
      <View
        onLayout={(event) => {
          sheetHeight.set(Math.max(1, event.nativeEvent.layout.height));
        }}
        style={[
          styles.sheet,
          { paddingBottom: resolveAndroidBottomInset(insets.bottom) + spacing.md },
        ]}
      >
        <View style={styles.handleWrap}>
          {Platform.OS === 'web' ? (
            <View style={styles.handleTouch}>
              <View style={styles.handle} />
            </View>
          ) : (
            <GestureDetector gesture={pan}>
              <View style={styles.handleTouch}>
                <View style={styles.handle} />
              </View>
            </GestureDetector>
          )}
          {onClose ? (
            <Pressable
              {...webKeyboardActivationProps(onClose)}
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
    zIndex: 2,
    height: 44,
    marginBottom: -28,
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handleTouch: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
  },
  close: {
    position: 'absolute',
    zIndex: 3,
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
