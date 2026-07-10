import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Mask, Rect, Stop } from 'react-native-svg';
import { colors } from '../theme/colors';

type Props = {
  height: number;
};

const LIVE = colors.live;

export function NowTimeTrail({ height }: Props) {
  return (
    <View style={[styles.wrap, { height }]} pointerEvents="none">
      <Svg width="100%" height={height} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="nowTrailVertical" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={LIVE} stopOpacity={0} />
            <Stop offset="0.4" stopColor={LIVE} stopOpacity={0.2} />
            <Stop offset="1" stopColor={LIVE} stopOpacity={0.55} />
          </LinearGradient>
          <LinearGradient id="nowTrailHorizontal" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="white" stopOpacity={0} />
            <Stop offset="0.1" stopColor="white" stopOpacity={1} />
            <Stop offset="0.9" stopColor="white" stopOpacity={1} />
            <Stop offset="1" stopColor="white" stopOpacity={0} />
          </LinearGradient>
          <Mask id="nowTrailEdgeMask">
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#nowTrailHorizontal)" />
          </Mask>
        </Defs>
        <Rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="url(#nowTrailVertical)"
          mask="url(#nowTrailEdgeMask)"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
});
