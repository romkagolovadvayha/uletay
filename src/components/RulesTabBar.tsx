import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { MotionPressable } from './MotionPressable';
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
  const [availableWidth, setAvailableWidth] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);

  const visibleCount = useMemo(() => {
    if (availableWidth <= 0) return Math.min(2, tabs.length);

    const estimatedWidths = tabs.map((tab) =>
      Math.max(78, tab.label.toUpperCase().length * 7.6 + 38),
    );
    const allTabsWidth =
      estimatedWidths.reduce((total, width) => total + width, 0) +
      Math.max(0, tabs.length - 1) * spacing.sm;

    if (allTabsWidth <= availableWidth) return tabs.length;

    const moreButtonWidth = 86;
    let occupiedWidth = moreButtonWidth;
    let count = 0;

    for (const tabWidth of estimatedWidths) {
      const requiredWidth = spacing.sm + tabWidth;
      if (occupiedWidth + requiredWidth > availableWidth) break;
      occupiedWidth += requiredWidth;
      count += 1;
    }

    return Math.max(1, count);
  }, [availableWidth, tabs]);

  const visibleTabs = tabs.slice(0, visibleCount);
  const overflowTabs = tabs.slice(visibleCount);
  const selectedInOverflow = overflowTabs.some((tab) => tab.id === selectedId);

  const handleLayout = (event: LayoutChangeEvent) => {
    setAvailableWidth(event.nativeEvent.layout.width);
    setMoreOpen(false);
  };

  const selectTab = (id: string) => {
    setMoreOpen(false);
    onSelect(id);
  };

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <View style={styles.row}>
        {visibleTabs.map((tab) => {
          const isActive = tab.id === selectedId;
          return (
            <MotionPressable
              key={tab.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              onPress={() => selectTab(tab.id)}
              style={[styles.pill, isActive && styles.pillActive]}
            >
              <Text numberOfLines={1} style={[styles.label, isActive && styles.labelActive]}>
                {tab.label.toUpperCase()}
              </Text>
            </MotionPressable>
          );
        })}

        {overflowTabs.length > 0 ? (
          <MotionPressable
            accessibilityRole="button"
            accessibilityLabel="Ещё разделы"
            accessibilityState={{ expanded: moreOpen, selected: selectedInOverflow }}
            onPress={() => setMoreOpen((open) => !open)}
            style={[styles.pill, styles.moreButton, selectedInOverflow && styles.pillActive]}
          >
            <Text style={[styles.label, selectedInOverflow && styles.labelActive]}>ЕЩЁ</Text>
            <Ionicons
              name={moreOpen ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={selectedInOverflow ? colors.primaryText : colors.text}
            />
          </MotionPressable>
        ) : null}
      </View>

      {moreOpen && overflowTabs.length > 0 ? (
        <View accessibilityRole="menu" style={styles.menu}>
          {overflowTabs.map((tab) => {
            const isActive = tab.id === selectedId;
            return (
              <Pressable
                key={tab.id}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: isActive }}
                onPress={() => selectTab(tab.id)}
                style={({ pressed }) => [
                  styles.menuItem,
                  isActive && styles.menuItemActive,
                  pressed && styles.menuItemPressed,
                ]}
              >
                <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
                  {tab.label}
                </Text>
                {isActive ? (
                  <Ionicons name="checkmark" size={18} color={colors.primaryText} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    paddingBottom: spacing.md,
    zIndex: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pill: {
    flexShrink: 1,
    minHeight: 42,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.pillInactive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  moreButton: {
    flexDirection: 'row',
    flexShrink: 0,
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.text,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  labelActive: {
    color: colors.primaryText,
    ...appFont('bold'),
  },
  menu: {
    position: 'absolute',
    top: 50,
    right: 0,
    minWidth: 220,
    maxWidth: '100%',
    padding: spacing.xs,
    gap: 2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceElevated,
    zIndex: 30,
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
  },
  menuItem: {
    minHeight: 46,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  menuItemActive: {
    backgroundColor: colors.text,
  },
  menuItemPressed: {
    opacity: 0.82,
  },
  menuLabel: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
  },
  menuLabelActive: {
    color: colors.primaryText,
    ...appFont('bold'),
  },
});
