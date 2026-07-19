import React, { useState } from 'react';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import { Animated, Platform, Pressable } from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
};

export function MotionPressable({
  style,
  pressedScale = 0.97,
  onPressIn,
  onPressOut,
  children,
  ...props
}: Props) {
  const [scale] = useState(() => new Animated.Value(1));

  const animateScale = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      damping: 18,
      stiffness: 260,
      mass: 0.6,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  return (
    <AnimatedPressable
      {...props}
      onPressIn={(event) => {
        animateScale(pressedScale);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animateScale(1);
        onPressOut?.(event);
      }}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}
