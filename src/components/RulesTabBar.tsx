import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { appFont, typography } from '../theme/typography';

type Tab = {
  id: string;
  label: string;
};

type Props = {
  tabs: Tab[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function RulesTabBar({ tabs, selectedId, onSelect }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {tabs.map((tab) => {
          const isActive = tab.id === selectedId;
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              onPress={() => onSelect(tab.id)}
              style={[styles.pill, isActive && styles.pillActive]}
            >
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.pillInactive,
  },
  pillActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  label: {
    ...typography.caption,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    color: colors.text,
  },
  labelActive: {
    color: colors.primaryText,
    ...appFont('bold'),
  },
});
