import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StageId } from '../types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { StageDot } from './StageDot';

const STAGE_LEGEND: { id: StageId; label: string }[] = [
  { id: 'south', label: 'ЮЖНАЯ СЦЕНА' },
  { id: 'west', label: 'ЗАПАДНАЯ СЦЕНА' },
  { id: 'ren-tv', label: 'РЕН ТВ' },
];

export function StageLegend() {
  return (
    <View style={styles.legend}>
      {STAGE_LEGEND.map((stage) => (
        <View key={stage.id} style={styles.legendItem}>
          <StageDot stageId={stage.id} />
          <Text style={styles.legendLabel}>{stage.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.xs / 2,
    paddingBottom: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
