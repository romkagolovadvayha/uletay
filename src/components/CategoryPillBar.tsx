import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
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
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {categories.map((category) => {
        const isActive = category.id === selectedId;
        const isFood = variant === 'food';

        return (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            onPress={() => onSelect(category.id)}
            style={[
              styles.pill,
              isFood ? styles.pillFood : styles.pillDefault,
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
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  pill: {
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
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
  pillFoodActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  label: {
    ...typography.caption,
    fontSize: 11,
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
