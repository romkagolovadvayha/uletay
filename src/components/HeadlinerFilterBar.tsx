import { ios, webStyle } from '../theme/ios';
import { Ionicons } from '@expo/vector-icons';
import React, { useId, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotionPressable } from './MotionPressable';
import { LiquidSelect } from './LiquidDialog';
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
  iconOnly?: boolean;
  style?: StyleProp<ViewStyle>;
};

function FilterSelect({ value, options, onChange, accessibilityLabel, iconOnly = false, style }: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const selectId = useId();
  const insets = useSafeAreaInsets();
  const selected = options.find((option) => option.id === value);

  return (
    <>
      <MotionPressable
        nativeID={selectId}
        accessibilityRole="button"
        accessibilityLabel={iconOnly ? `${accessibilityLabel}: ${selected?.label ?? value}` : accessibilityLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={`${selectId}-menu`}
        onPress={() => setOpen(true)}
        style={[styles.select, style]}
      >
        {iconOnly ? (
          <Ionicons name="swap-vertical" size={20} color={colors.text} />
        ) : (
          <>
            <Text style={styles.selectLabel} numberOfLines={1}>
              {selected?.label ?? value}
            </Text>
            <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
          </>
        )}
      </MotionPressable>

      {Platform.OS === 'web' ? <LiquidSelect open={open} onClose={() => setOpen(false)}
        title={accessibilityLabel} anchorId={selectId} id={`${selectId}-menu`} value={value}
        options={options} onChange={onChange} /> : <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
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
                <MotionPressable
                  key={option.id}
                  accessibilityRole="button"
                  aria-pressed={isActive}
                  onPress={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                  style={[
                    styles.menuItem,
                    isActive && styles.menuItemActive,
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
                </MotionPressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>}
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
  const { width } = useWindowDimensions();
  const compactSearch = Platform.OS === 'web' && width < 400 && searchQuery.length > 0;
  const sortOptions = useMemo(
    () => HEADLINER_SORT_OPTIONS.map((option) => ({ id: option.id, label: option.label })),
    [],
  );

  return (
    <View style={styles.row}>
      <View nativeID={Platform.OS === 'web' ? 'headliner-search-field' : undefined} style={styles.searchWrap}>
        {!compactSearch ? <Ionicons name="search" size={Platform.OS === 'web' ? 20 : 16} color={colors.textMuted} style={styles.searchIcon} /> : null}
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
        {Platform.OS === 'web' && searchQuery ? (
          <MotionPressable accessibilityRole="button" accessibilityLabel="Очистить поиск" onPress={() => onSearchQueryChange('')} style={styles.clearSearch}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </MotionPressable>
        ) : null}
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
        iconOnly={Platform.OS === 'web'}
        value={sortMode}
        options={sortOptions}
        onChange={(id) => onSortModeChange(id as HeadlinerSortMode)}
        style={styles.sortSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clearSearch: { width: 44, height: 44, flexShrink: 0, alignItems: 'center', justifyContent: 'center', marginRight: -8, borderRadius: radius.pill },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.md,
    ...webStyle({ flexWrap: 'nowrap', gap: 8 }),
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
    height: 44,
    ...ios.field, ...webStyle({ flexBasis: 0, paddingHorizontal: 12 }),
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: 44,
    ...typography.body,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 0,
    outlineWidth: 0,
    ...webStyle({ height: 48, fontSize: 17, lineHeight: 22 }),
  },
  select: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    ...ios.field, ...webStyle({ height: 48, paddingHorizontal: 16, gap: 8 }),
  },
  yearSelect: {
    flexShrink: 0,
    minWidth: 72,
    maxWidth: 96,
    ...webStyle({ width: 96, minWidth: 96, maxWidth: 96, paddingLeft: 16, paddingRight: 16, justifyContent: 'space-between' }),
  },
  sortSelect: {
    flexShrink: 1,
    minWidth: 96,
    maxWidth: 148,
    ...webStyle({ width: 48, minWidth: 48, maxWidth: 48, flexGrow: 0, flexShrink: 0, paddingHorizontal: 0, justifyContent: 'center' }),
  },
  selectLabel: {
    ...typography.caption,
    color: colors.text,
    fontSize: 12,
    flexShrink: 1,
    textTransform: 'none',
    letterSpacing: 0,
    ...ios.chipLabel,
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
    ...ios.glass, ...webStyle({ maxWidth: 440, maxHeight: '75%', alignSelf: 'center', borderRadius: 28 }),
  },
  menu: {
    flexGrow: 0,
    ...webStyle({ padding: 8 }),
  },
  menuItem: {
    minHeight: 46,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    ...webStyle({ minHeight: 52, borderRadius: 18, paddingHorizontal: 16 }),
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
    ...ios.secondary,
  },
  menuItemLabelActive: {
    ...appFont('semiBold'),
    color: colors.primary,
  },
});
