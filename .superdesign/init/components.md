# Shared UI components

Framework: Expo SDK 57 / React Native 0.86 / React Native Web. The app uses custom
React Native primitives rather than a third-party component library.

## PrimaryButton

- Source: `src/components/PrimaryButton.tsx`
- Purpose: primary festival CTA shared by map cards and content screens.
- Props: `label`, `onPress`, `style`, `textStyle`.

```tsx
import React from 'react';
import { Pressable, StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = {
  label: string;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export function PrimaryButton({ label, onPress, style, textStyle }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
    >
      <Text style={[styles.label, textStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 17,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  label: {
    ...typography.button,
    color: colors.primaryText,
  },
});
```

## ScreenTitle

- Source: `src/components/ScreenTitle.tsx`
- Purpose: native `Text` title and semantic web `h1`.

```tsx
import React, { createElement } from 'react';
import { Platform, StyleSheet, Text, TextProps, TextStyle } from 'react-native';

const webHeadingReset: TextStyle =
  Platform.OS === 'web'
    ? {
        margin: 0,
        padding: 0,
        borderWidth: 0,
      }
    : {};

type Props = Pick<TextProps, 'numberOfLines' | 'accessibilityLabel'> & {
  children: TextProps['children'];
  style?: TextStyle | TextStyle[];
};

export function ScreenTitle({ children, style, numberOfLines, accessibilityLabel }: Props) {
  const flattenedStyle = StyleSheet.flatten([webHeadingReset, style]);

  if (Platform.OS === 'web') {
    return createElement(
      'h1',
      {
        style: flattenedStyle,
        'aria-label': accessibilityLabel,
      },
      children,
    );
  }

  return (
    <Text style={style} numberOfLines={numberOfLines} accessibilityLabel={accessibilityLabel}>
      {children}
    </Text>
  );
}
```

## MapFilterChips

- Source: `src/components/map/MapFilterChips.tsx`
- Purpose: horizontally scrollable category filter for the festival map.

```tsx
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { MapFilterId, MapZonesGeoJson } from '../../types/map';
import { mapColors } from '../../theme/map';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { getActiveZoneTypes, ZONE_TYPE_LABELS } from '../../utils/map/layerStyles';

type Props = {
  zones?: MapZonesGeoJson;
  value: MapFilterId;
  onChange: (value: MapFilterId) => void;
};

export function MapFilterChips({ zones, value, onChange }: Props) {
  const filters = useMemo(() => {
    const zoneTypes = getActiveZoneTypes(zones?.features ?? []);
    return [
      { id: 'all' as const, label: 'Все' },
      ...zoneTypes.map((zoneType) => ({
        id: zoneType as MapFilterId,
        label: ZONE_TYPE_LABELS[zoneType],
      })),
    ];
  }, [zones?.features]);

  if (filters.length <= 1) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {filters.map((filter) => {
          const active = filter.id === value;
          return (
            <Pressable
              key={filter.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(filter.id)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{filter.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: spacing.sm,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 100,
  },
  row: {
    paddingHorizontal: spacing.screen,
    gap: spacing.sm,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: mapColors.chipInactive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: mapColors.chipActive,
  },
  chipText: {
    ...typography.caption,
    color: mapColors.chipTextInactive,
  },
  chipTextActive: {
    color: mapColors.chipTextActive,
    fontWeight: '600',
  },
});
```

## MapFabGroup

- Source: `src/components/map/MapFabGroup.tsx`
- Purpose: location and festival-center map actions.

```tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { mapColors } from '../../theme/map';
import { spacing } from '../../theme/spacing';

type MapFabProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
};

function MapFab({ icon, label, onPress, active }: MapFabProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        active && styles.fabActive,
        pressed && styles.fabPressed,
      ]}
    >
      <Ionicons name={icon} size={22} color={active ? '#000' : '#FFF'} />
    </Pressable>
  );
}

type Props = {
  onLocate: () => void;
  onFestival: () => void;
  followUser: boolean;
};

export function MapFabGroup({ onLocate, onFestival, followUser }: Props) {
  return (
    <View style={styles.col}>
      <MapFab icon="locate" label="Моё местоположение" onPress={onLocate} active={followUser} />
      <MapFab icon="flag-outline" label="К фестивалю" onPress={onFestival} />
    </View>
  );
}

const styles = StyleSheet.create({
  col: {
    position: 'absolute',
    right: spacing.screen,
    bottom: 160,
    gap: spacing.sm,
    zIndex: 25,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: mapColors.fabBg,
    borderWidth: 1,
    borderColor: mapColors.fabBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabActive: {
    backgroundColor: mapColors.chipActive,
  },
  fabPressed: {
    transform: [{ scale: 0.94 }],
  },
});
```
