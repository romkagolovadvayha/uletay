import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { sectionHeaderSpacing, sectionHeaderSpacingMuted } from '../theme/layout';
import { typography } from '../theme/typography';

type Props = {
  title: string;
  variant?: 'default' | 'muted';
  style?: ViewStyle;
};

export function SectionHeader({ title, variant = 'default', style }: Props) {
  return (
    <View
      style={[
        styles.container,
        variant === 'muted' ? sectionHeaderSpacingMuted : sectionHeaderSpacing,
        style,
      ]}
    >
      <Text style={[variant === 'muted' ? styles.mutedTitle : styles.title]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  title: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  mutedTitle: {
    ...typography.sectionMuted,
    color: colors.textSecondary,
  },
});
