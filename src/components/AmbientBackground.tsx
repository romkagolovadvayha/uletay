import React, { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

export function AmbientBackground() {
  const id = useId().replace(/:/g, '');
  return <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    <Svg width="100%" height="100%" viewBox="0 0 400 900" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={`${id}-beam`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F4DEA9" stopOpacity={0.10} />
          <Stop offset="0.5" stopColor="#F4DEA9" stopOpacity={0.035} />
          <Stop offset="1" stopColor="#F4DEA9" stopOpacity={0} />
        </LinearGradient>
        <RadialGradient id={`${id}-glow`} cx="50%" cy="0%" rx="90%" ry="85%">
          <Stop offset="0" stopColor="#CBB583" stopOpacity={0.07} />
          <Stop offset="1" stopColor="#CBB583" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="400" height="900" fill="#050608" />
      <Rect width="400" height="900" fill={`url(#${id}-glow)`} />
      <Path d="M-16 -72 L185 900 L400 900 Z" fill={`url(#${id}-beam)`} />
      <Path d="M416 -72 L215 900 L0 900 Z" fill={`url(#${id}-beam)`} />
    </Svg>
  </View>;
}
