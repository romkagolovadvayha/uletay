import React, { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

export function AmbientBackground() {
  const id = useId().replace(/:/g, '');
  return <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    <Svg width="100%" height="100%" viewBox="0 0 400 900" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={`${id}-beam`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#360c24" />
          <Stop offset="0.6" stopColor="#1e0917" />
          <Stop offset="1" stopColor="#100b0f" />
        </LinearGradient>
        <RadialGradient id={`${id}-glow`} cx="50%" cy="0%" rx="90%" ry="85%">
          <Stop offset="0" stopColor="#8b174c" stopOpacity={0.30} />
          <Stop offset="1" stopColor="#8b174c" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="400" height="900" fill={`url(#${id}-beam)`} />
      <Rect width="400" height="900" fill={`url(#${id}-glow)`} />
    </Svg>
  </View>;
}
