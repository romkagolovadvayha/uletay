import type { ReactNode } from 'react';
import type { Insets, StyleProp, ViewStyle } from 'react-native';

export type BackButtonProps = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  hitSlop?: number | Insets;
  children: ReactNode;
};
