import React, { useEffect, useId, useRef } from 'react';
import { I18nManager, StyleSheet } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '../theme/colors';

type Props = {
  activeIndex: number;
  tabCount: number;
  width: number;
  height: number;
};

/** A single light source travels behind the tabs; the SVG stays static on each frame. */
export function TabSpotlight({ activeIndex, tabCount, width, height }: Props) {
  const id = useId().replace(/:/g, '');
  const tabWidth = width / tabCount;
  const lightWidth = Math.min(tabWidth * 1.45, 96);
  const visualIndex = I18nManager.isRTL ? tabCount - 1 - activeIndex : activeIndex;
  const targetX = tabWidth * (visualIndex + 0.5) - lightWidth / 2;
  const translateX = useSharedValue(targetX);
  const previousLayout = useRef({ width, tabCount });

  useEffect(() => {
    const layoutChanged =
      previousLayout.current.width !== width || previousLayout.current.tabCount !== tabCount;
    previousLayout.current = { width, tabCount };

    // Resizing/reconfiguring the menu snaps into place; tab changes can be interrupted.
    translateX.set(
      layoutChanged
        ? targetX
        : withSpring(targetX, {
            duration: 400,
            dampingRatio: 1,
            overshootClamping: true,
            reduceMotion: ReduceMotion.System,
          }),
    );
  }, [tabCount, targetX, translateX, width]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.get() }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      testID="tab-spotlight"
      style={[styles.light, { width: lightWidth, height }, animatedStyle]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 96 64" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={`${id}-beam`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.tabActive} stopOpacity={0.32} />
            <Stop offset="0.35" stopColor={colors.tabActive} stopOpacity={0.14} />
            <Stop offset="0.75" stopColor={colors.tabActive} stopOpacity={0.04} />
            <Stop offset="1" stopColor={colors.tabActive} stopOpacity={0} />
          </LinearGradient>
          <RadialGradient id={`${id}-halo`} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={colors.tabActive} stopOpacity={0.6} />
            <Stop offset="0.4" stopColor={colors.tabActive} stopOpacity={0.2} />
            <Stop offset="1" stopColor={colors.tabActive} stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id={`${id}-strip`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colors.tabActive} />
            <Stop offset="0.5" stopColor={colors.tabLightCore} />
            <Stop offset="1" stopColor={colors.tabActive} />
          </LinearGradient>
        </Defs>
        <Path d="M 30 0 H 66 L 96 64 H 0 Z" fill={`url(#${id}-beam)`} opacity={0.4} />
        <Path d="M 32 0 H 64 L 88 64 H 8 Z" fill={`url(#${id}-beam)`} opacity={0.5} />
        <Path d="M 34 0 H 62 L 80 64 H 16 Z" fill={`url(#${id}-beam)`} />
        <Ellipse cx="48" cy="3" rx="36" ry="19" fill={`url(#${id}-halo)`} />
        <Rect x="31" y="0" width="34" height="4" rx="2" fill={`url(#${id}-strip)`} />
        <Rect x="35" y="0" width="26" height="1" rx="0.5" fill={colors.tabLightCore} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  light: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
