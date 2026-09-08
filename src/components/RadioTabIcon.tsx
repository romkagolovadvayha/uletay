import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRadioPlayer } from '../context/RadioPlayerContext';
import { DeferredIonicons } from './DeferredIonicons';

type Props = {
  color: string;
  size?: number;
};

const BAR_SCALES = [0.55, 1, 0.72, 0.88] as const;

function EqualizerBar({
  color,
  scale,
  maxHeight,
  width,
}: {
  color: string;
  scale: number;
  maxHeight: number;
  width: number;
}) {
  return (
    <View
      style={[
        styles.bar,
        {
          width,
          height: Math.max(3, maxHeight * scale),
          backgroundColor: color,
        },
      ]}
    />
  );
}

export function RadioTabIcon({ color, size = 22 }: Props) {
  const { isPlaying } = useRadioPlayer();

  if (!isPlaying) {
    return <DeferredIonicons name="radio" size={size} color={color} />;
  }

  const barWidth = Math.max(2, Math.round(size * 0.14));
  const gap = Math.max(2, Math.round(size * 0.1));

  return (
    <View style={[styles.equalizer, { width: size, height: size, gap }]}>
      {BAR_SCALES.map((scale, index) => (
        <EqualizerBar
          key={index}
          color={color}
          scale={scale}
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
