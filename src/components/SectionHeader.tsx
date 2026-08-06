import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { sectionHeaderSpacing, sectionHeaderSpacingMuted } from '../theme/layout';
import { typography } from '../theme/typography';
import { SemanticHeading } from './SemanticHeading';

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
      <SemanticHeading
        level={2}
        style={variant === 'muted' ? styles.mutedTitle : styles.title}
      >
        {title}
      </SemanticHeading>
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
