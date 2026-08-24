import React, { useState } from 'react';
import type {
  PressableProps,
  PressableStateCallbackType,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Platform, Pressable } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { webKeyboardActivationProps } from '../utils/webKeyboardActivation';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESS_DURATION_MS = 120;
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)' as const;

type Props = Omit<PressableProps, 'style'> & {
  style?:
    | StyleProp<ViewStyle>
    | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
  pressedScale?: number;
  /** Web counterpart for a native selected/toggled state. */
  'aria-pressed'?: boolean;
};

function isPointerPress(
  event: Parameters<NonNullable<PressableProps['onPressIn']>>[0],
) {
  return (
    Platform.OS !== 'web' ||
    Boolean(
      (event.nativeEvent as typeof event.nativeEvent & { pointerType?: string })
        .pointerType,
    )
  );
}

export function MotionPressable({
  style,
  pressedScale = 0.97,
  onPressIn,
  onPressOut,
  onPress,
  disabled = false,
  pressRetentionOffset = 16,
  children,
  ...props
}: Props) {
  const [pressed, setPressed] = useState(false);
  const reduceMotion = useReducedMotion();
  const resolvedStyle = typeof style === 'function' ? style({ pressed }) : style;

  return (
    <AnimatedPressable
      {...props}
      {...webKeyboardActivationProps(
        () => onPress?.({} as Parameters<NonNullable<PressableProps['onPress']>>[0]),
        disabled,
      )}
      disabled={disabled}
      onPress={onPress}
      pressRetentionOffset={pressRetentionOffset}
      onPressIn={(event) => {
        setPressed(isPointerPress(event));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        onPressOut?.(event);
      }}
      style={[
        resolvedStyle,
        {
          transform: [{ scale: pressed && !reduceMotion ? pressedScale : 1 }],
          transitionProperty: 'transform',
          transitionDuration: reduceMotion ? 0 : PRESS_DURATION_MS,
          transitionTimingFunction: EASE_OUT,
        },
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}
