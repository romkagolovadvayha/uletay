import React, { useId, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { quizColors as c, quizStyles as s } from '../theme/quiz';

/** Correct-answer celebration lives entirely over the illustration, without reflow. */
export function QuizMagicBurst() {
  const reduced = useReducedMotion();
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [size, setSize] = useState({ width: 300, height: 240 });
  const radius = Math.min(size.width, size.height) * 0.47;
  return <View style={s.magicOverlay} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" onLayout={event => {
    const { width, height } = event.nativeEvent.layout;
    setSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
  }}>
    {!reduced && <>
      <Animated.View style={[s.magicFlash, { animationName: { from: { opacity: 0, transform: [{ scale: 0.92 }] }, '20%': { opacity: 1 }, to: { opacity: 0, transform: [{ scale: 1.15 }] } }, animationDuration: 1150, animationFillMode: 'both', animationTimingFunction: 'ease-out' }]}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" accessible={false}><Defs><RadialGradient id={`${id}light`} cx="50%" cy="48%" rx="50%" ry="50%"><Stop offset="0" stopColor={c.goldLight} stopOpacity=".65" /><Stop offset=".45" stopColor={c.gold} stopOpacity=".3" /><Stop offset="1" stopColor={c.gold} stopOpacity="0" /></RadialGradient></Defs><Rect width="100" height="100" fill={`url(#${id}light)`} /></Svg>
      </Animated.View>
      {Array.from({ length: 16 }, (_, index) => {
        const angle = (index / 16) * Math.PI * 2 - Math.PI / 2;
        const distance = radius * (index % 2 ? 0.78 : 1.08);
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        const large = index % 3 === 0;
        return <Animated.View key={index} style={[s.magicParticle, large && s.magicParticleLarge, {
          animationName: {
            from: { opacity: 0, transform: [{ translateX: x * 0.2 }, { translateY: y * 0.2 }, { scale: 0.9 }, { rotate: '0deg' }] },
            '15%': { opacity: 1 },
            '65%': { opacity: 1 },
            to: { opacity: 0, transform: [{ translateX: x }, { translateY: y }, { scale: 0.7 }, { rotate: `${index % 2 ? 100 : -100}deg` }] },
          },
          animationDuration: 1350, animationDelay: (index % 4) * 55, animationFillMode: 'both', animationTimingFunction: 'ease-out',
        }]}>
          <Svg width="100%" height="100%" viewBox="0 0 20 20" accessible={false}><Path d="M10 0L12.7 7.3 20 10 12.7 12.7 10 20 7.3 12.7 0 10 7.3 7.3Z" fill={index % 3 ? c.goldLight : c.cream} /></Svg>
        </Animated.View>;
      })}
    </>}
    <Animated.View style={[s.magicBadge, !reduced && { animationName: { from: { opacity: 0, transform: [{ translateY: 10 }, { scale: 0.94 }] }, to: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] } }, animationDuration: 250, animationFillMode: 'both', animationTimingFunction: 'ease-out' }]}>
      <Svg width="20" height="20" viewBox="0 0 20 20" accessible={false}><Path d="M4 10L8 14 16 5" fill="none" stroke={c.primaryText} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></Svg>
      <Text style={s.magicBadgeText}>Верно!</Text>
    </Animated.View>
  </View>;
}
