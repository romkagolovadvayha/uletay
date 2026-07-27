import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useRadioPlayer } from '../context/RadioPlayerContext';
import { DeferredIonicons } from './DeferredIonicons';

type Props = {
  color: string;
  size?: number;
};

const BAR_DELAYS = [0, 120, 60, 180] as const;

function EqualizerBar({
  color,
  delay,
  maxHeight,
  width,
}: {
  color: string;
  delay: number;
  maxHeight: number;
  width: number;
}) {
  const scale = useSharedValue(0.35);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 320, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.3, { duration: 320, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [delay, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: maxHeight * scale.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          width,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

export function RadioTabIcon({ color, size = 22 }: Props) {
  const { isPlaying } = useRadioPlayer();

  if (!isPlaying) {
    return <DeferredIonicons name="radio-outline" size={size} color={color} />;
  }

  const barWidth = Math.max(2, Math.round(size * 0.14));
  const gap = Math.max(2, Math.round(size * 0.1));

  return (
    <View style={[styles.equalizer, { width: size, height: size, gap }]}>
      {BAR_DELAYS.map((delay) => (
        <EqualizerBar
          key={delay}
          color={color}
          delay={delay}
          maxHeight={size}
          width={barWidth}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  equalizer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bar: {
    borderRadius: 1,
    minHeight: 3,
  },
});
