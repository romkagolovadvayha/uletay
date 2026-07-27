import React from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';

type Props = ViewProps & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'muted';
  padding?: 'none' | 'compact' | 'default';
};

const paddingStyles = {
  none: undefined,
  compact: { padding: spacing.md },
  default: { padding: spacing.lg },
} satisfies Record<NonNullable<Props['padding']>, ViewStyle | undefined>;

export function SurfaceCard({
  children,
  style,
  variant = 'default',
  padding = 'default',
  ...props
}: Props) {
  return (
    <View
      {...props}
      style={[
        styles.card,
        variant === 'muted' && styles.muted,
        paddingStyles[padding],
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
  },
  muted: {
    backgroundColor: colors.surfaceMuted,
  },
});
