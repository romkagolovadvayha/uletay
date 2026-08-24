import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Stage, StageId } from '../types';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { MotionPressable } from './MotionPressable';

type Props = {
  stages: Stage[];
  selectedStageId: StageId;
  onSelect: (stageId: StageId) => void;
};

export function StageTabBar({ stages, selectedStageId, onSelect }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {stages.map((stage) => {
        const isActive = stage.id === selectedStageId;
        return (
          <MotionPressable
            key={stage.id}
            accessibilityRole="button"
            onPress={() => onSelect(stage.id)}
            style={[styles.tab, isActive && styles.activeTab]}
          >
            <Text style={[styles.label, isActive && styles.activeLabel]}>{stage.shortName}</Text>
          </MotionPressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.screen,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  tab: {
    borderRadius: radius.pill,
    paddingHorizontal: 15,
    paddingVertical: 9,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeTab: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  activeLabel: {
    color: colors.primaryText,
  },
});
