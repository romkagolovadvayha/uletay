import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { appFont, typography } from '../theme/typography';

const VISIBLE_TAB_COUNT = 2;
const DROPDOWN_MIN_WIDTH = 220;
const DROPDOWN_MAX_WIDTH = 280;
const DROPDOWN_MIN_HEIGHT = 120;

type Tab = {
  id: string;
  label: string;
};

type DropdownLayout = {
  left: number;
  width: number;
  maxHeight: number;
  openUpward: boolean;
};

type Props = {
  tabs: Tab[];
  selectedId: string;
  onSelect: (id: string) => void;
  dropdownOpen: boolean;
  onDropdownOpenChange: (open: boolean) => void;
};

export function RulesTabBar({
  tabs,
  selectedId,
  onSelect,
  dropdownOpen,
  onDropdownOpenChange,
}: Props) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const moreRef = useRef<View>(null);
  const [dropdownLayout, setDropdownLayout] = useState<DropdownLayout | null>(null);

  const primaryTabs = tabs.slice(0, VISIBLE_TAB_COUNT);
  const overflowTabs = tabs.slice(VISIBLE_TAB_COUNT);
  const hasOverflow = overflowTabs.length > 0;
  const isOverflowSelected = overflowTabs.some((tab) => tab.id === selectedId);

  const updateDropdownLayout = useCallback(() => {
    moreRef.current?.measureInWindow((anchorX, anchorY, anchorWidth, anchorHeight) => {
      const horizontalPadding = spacing.screen;
      const dropdownWidth = Math.min(
        DROPDOWN_MAX_WIDTH,
        Math.max(DROPDOWN_MIN_WIDTH, windowWidth - horizontalPadding * 2),
      );

      let windowLeft = anchorX + anchorWidth - dropdownWidth;
      windowLeft = Math.max(
        horizontalPadding,
        Math.min(windowLeft, windowWidth - horizontalPadding - dropdownWidth),
      );

      const spaceBelow = windowHeight - anchorY - anchorHeight - spacing.md;
      const spaceAbove = anchorY - spacing.md;
      const openUpward = spaceBelow < DROPDOWN_MIN_HEIGHT && spaceAbove > spaceBelow;
      const availableSpace = openUpward ? spaceAbove : spaceBelow;
      const maxHeight = Math.max(
        DROPDOWN_MIN_HEIGHT,
        Math.min(availableSpace - spacing.sm, 360),
      );

      setDropdownLayout({
        left: windowLeft - anchorX,
        width: dropdownWidth,
        maxHeight,
        openUpward,
      });
    });
  }, [windowHeight, windowWidth]);

  useEffect(() => {
    if (!dropdownOpen) {
      setDropdownLayout(null);
      return;
    }

    const frame = requestAnimationFrame(updateDropdownLayout);
    return () => cancelAnimationFrame(frame);
  }, [dropdownOpen, updateDropdownLayout, overflowTabs.length]);

  const layout =
    dropdownLayout ??
    (dropdownOpen
      ? {
          left: 0,
          width: Math.min(DROPDOWN_MAX_WIDTH, windowWidth - spacing.screen * 2),
          maxHeight: 280,
          openUpward: false,
        }
      : null);

  const handleSelect = (id: string) => {
    onSelect(id);
    onDropdownOpenChange(false);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {primaryTabs.map((tab) => {
          const isActive = tab.id === selectedId;
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              onPress={() => handleSelect(tab.id)}
              style={[styles.pill, isActive && styles.pillActive]}
            >
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}

        {hasOverflow ? (
          <View
            ref={moreRef}
            collapsable={false}
            style={styles.moreWrap}
            onLayout={() => {
              if (dropdownOpen) {
                updateDropdownLayout();
              }
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: dropdownOpen, selected: isOverflowSelected }}
              onPress={() => onDropdownOpenChange(!dropdownOpen)}
              style={[
                styles.pill,
                styles.morePill,
                (isOverflowSelected || dropdownOpen) && styles.pillActive,
              ]}
            >
              <Text
                style={[
                  styles.label,
                  (isOverflowSelected || dropdownOpen) && styles.labelActive,
                ]}
              >
                ЕЩЁ
              </Text>
              <Ionicons
                name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={
                  isOverflowSelected || dropdownOpen ? colors.primaryText : colors.text
                }
              />
            </Pressable>

            {dropdownOpen && layout ? (
              <View
                style={[
                  styles.dropdown,
                  {
                    left: layout.left,
                    width: layout.width,
                    maxHeight: layout.maxHeight,
                  },
                  layout.openUpward
                    ? { top: undefined, bottom: '100%', marginTop: 0, marginBottom: spacing.xs }
                    : { top: '100%', bottom: undefined, marginTop: spacing.xs, marginBottom: 0 },
                ]}
              >
                <ScrollView
                  bounces={false}
                  showsVerticalScrollIndicator
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                >
                  {overflowTabs.map((tab) => {
                    const isActive = tab.id === selectedId;
                    return (
                      <Pressable
                        key={tab.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isActive }}
                        onPress={() => handleSelect(tab.id)}
                        style={({ pressed }) => [
                          styles.dropdownItem,
                          isActive && styles.dropdownItemActive,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dropdownLabel,
                            isActive && styles.dropdownLabelActive,
                          ]}
                        >
                          {tab.label}
                        </Text>
                        {isActive ? (
                          <Ionicons name="checkmark" size={16} color={colors.primary} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: spacing.md,
    zIndex: 20,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
  morePill: {
    zIndex: 21,
  },
  moreWrap: {
    position: 'relative',
    zIndex: 22,
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
  dropdown: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 23,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  dropdownItemActive: {
    backgroundColor: colors.surfaceMuted,
  },
  dropdownLabel: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    flex: 1,
  },
  dropdownLabelActive: {
    ...appFont('semiBold'),
    color: colors.primary,
  },
  pressed: {
    opacity: 0.9,
  },
});
