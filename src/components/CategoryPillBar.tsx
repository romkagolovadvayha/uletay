import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { MotionPressable } from './MotionPressable';
import { CenteredHorizontalScroll } from './CenteredHorizontalScroll';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { appFont, typography } from '../theme/typography';

type Category = {
  id: string;
  label: string;
};

type Props = {
  categories: Category[];
  selectedId: string;
  onSelect: (id: string) => void;
  variant?: 'food' | 'default';
};

export function CategoryPillBar({ categories, selectedId, onSelect, variant = 'default' }: Props) {
  return (
    <CenteredHorizontalScroll
      contentContainerStyle={styles.container}
      rowStyle={[styles.row, variant === 'food' && styles.rowFood]}
    >
      {categories.map((category) => {
        const isActive = category.id === selectedId;
        const isFood = variant === 'food';

        return (
          <MotionPressable
            key={category.id}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            aria-pressed={isActive}
            onPress={() => onSelect(category.id)}
            style={[
              styles.pill,
              isFood ? [styles.pillFood, styles.pillFoodCompact] : styles.pillDefault,
              isActive && (isFood ? styles.pillFoodActive : styles.pillDefaultActive),
            ]}
          >
            <Text
              style={[
                styles.label,
                isFood ? styles.labelFood : styles.labelDefault,
                isActive && (isFood ? styles.labelFoodActive : styles.labelDefaultActive),
              ]}
            >
              {category.label.toUpperCase()}
            </Text>
          </MotionPressable>
        );
      })}
    </CenteredHorizontalScroll>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.md,
  },
  row: {
    gap: spacing.sm,
  },
  rowFood: {
    gap: spacing.xs,
  },
  pill: {
    flexShrink: 1,
    minHeight: 44,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillDefault: {
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  pillDefaultActive: {
    backgroundColor: colors.primary,
  },
  pillFood: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.pillInactive,
  },
  pillFoodCompact: {
    paddingHorizontal: spacing.sm,
  },
  pillFoodActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  label: {
    ...typography.caption,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  labelDefault: {
    color: colors.primary,
  },
  labelDefaultActive: {
    color: colors.primaryText,
    ...appFont('bold'),
  },
  labelFood: {
    color: colors.text,
  },
  labelFoodActive: {
    color: colors.primaryText,
    ...appFont('bold'),
  },
});
