import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { appFont, typography } from '../theme/typography';
import {
  HEADLINER_SORT_OPTIONS,
  type HeadlinerSortMode,
} from '../utils/headlinerHelpers';

type Option = {
  id: string;
  label: string;
};

type FilterSelectProps = {
  value: string;
  options: Option[];
  onChange: (id: string) => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

function FilterSelect({ value, options, onChange, accessibilityLabel, style }: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const selected = options.find((option) => option.id === value);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.select, style, pressed && styles.pressed]}
      >
        <Text style={styles.selectLabel} numberOfLines={1}>
          {selected?.label ?? value}
        </Text>
        <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View
          style={[
            styles.backdrop,
            {
              paddingTop: insets.top + spacing.md,
              paddingBottom: insets.bottom + spacing.md,
            },
          ]}
        >
          <Pressable style={styles.backdropPress} onPress={() => setOpen(false)} />
          <ScrollView
            style={styles.menuScroll}
            contentContainerStyle={styles.menu}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            showsVerticalScrollIndicator={options.length > 6}
          >
            {options.map((option) => {
              const isActive = option.id === value;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="button"
                  onPress={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.menuItem,
                    isActive && styles.menuItemActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[styles.menuItemLabel, isActive && styles.menuItemLabelActive]}
                    numberOfLines={2}
                  >
                    {option.label}
                  </Text>
                  {isActive ? (
                    <Ionicons name="checkmark" size={16} color={colors.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

type Props = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  selectedYear: string;
  yearOptions: Option[];
  onYearChange: (year: string) => void;
  sortMode: HeadlinerSortMode;
  onSortModeChange: (mode: HeadlinerSortMode) => void;
};

export function HeadlinerFilterBar({
  searchQuery,
  onSearchQueryChange,
  selectedYear,
  yearOptions,
  onYearChange,
  sortMode,
  onSortModeChange,
}: Props) {
  const sortOptions = useMemo(
    () => HEADLINER_SORT_OPTIONS.map((option) => ({ id: option.id, label: option.label })),
    [],
  );

  return (
    <View style={styles.row}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          accessibilityLabel="Поиск хэдлайнера"
          value={searchQuery}
          onChangeText={onSearchQueryChange}
          placeholder="Поиск"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      <FilterSelect
        accessibilityLabel="Год фестиваля"
        value={selectedYear}
        options={yearOptions}
        onChange={onYearChange}
        style={styles.yearSelect}
      />

      <FilterSelect
        accessibilityLabel="Сортировка"
        value={sortMode}
        options={sortOptions}
        onChange={(id) => onSortModeChange(id as HeadlinerSortMode)}
        style={styles.sortSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  searchWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    height: 40,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    ...typography.body,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 0,
    outlineWidth: 0,
  },
  select: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
  },
  yearSelect: {
    flexShrink: 0,
    minWidth: 72,
    maxWidth: 96,
  },
  sortSelect: {
    flexShrink: 1,
    minWidth: 96,
    maxWidth: 148,
  },
  selectLabel: {
    ...typography.caption,
    color: colors.text,
    fontSize: 12,
    flexShrink: 1,
    textTransform: 'none',
    letterSpacing: 0,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    paddingHorizontal: spacing.screen,
  },
  backdropPress: {
    ...StyleSheet.absoluteFill,
  },
  menuScroll: {
    flexGrow: 0,
    width: '100%',
    maxHeight: '100%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  menu: {
    flexGrow: 0,
  },
  menuItem: {
    minHeight: 46,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  menuItemActive: {
    backgroundColor: colors.surfaceMuted,
  },
  menuItemLabel: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    flex: 1,
    flexShrink: 1,
  },
  menuItemLabelActive: {
    ...appFont('semiBold'),
    color: colors.primary,
  },
  pressed: {
    opacity: 0.75,
  },
});
