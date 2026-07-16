import { Ionicons } from '@expo/vector-icons';
import React, { ComponentProps } from 'react';
import { View } from 'react-native';
import { useIconsReady } from '../context/IconsReadyContext';

type Props = ComponentProps<typeof Ionicons>;

/**
 * Renders Ionicons only after the font is loaded with font-display: swap.
 * Prevents vector-icons' componentDidMount loadAsync (no display) from racing LCP.
 */
export function DeferredIonicons({ size = 24, style, ...rest }: Props) {
  const iconsReady = useIconsReady();
  const boxSize = typeof size === 'number' ? size : 24;

  if (!iconsReady) {
    return <View style={[{ width: boxSize, height: boxSize }, style]} />;
  }

  return <Ionicons size={size} style={style} {...rest} />;
}
