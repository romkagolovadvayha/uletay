import React from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type Props = {
  style?: TextStyle;
};

export function CompetitionLabel({ style }: Props) {
  return <Text style={[styles.label, style]}>Конкурс</Text>;
}

const styles = StyleSheet.create({
  label: {
    ...typography.caption,
    color: colors.competitionLabel,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
