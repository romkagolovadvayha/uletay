import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { appFont } from '../theme/typography';
import { MotionPressable } from './MotionPressable';


export type FilterTab<T extends string = string> = {
  id: T;
  label: string;
  caption?: string;
  detail?: string;
  accessibilityLabel?: string;
};

export type FilterTabsProps<T extends string = string> = {
  items: FilterTab<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  layout?: 'row' | 'dates';
  role?: 'tablist' | 'radiogroup';
  inset?: number;
  surface?: boolean;
};

export function FilterTabs<T extends string>({ items, value, onChange, label, layout = 'row', role = 'tablist', inset = 0, surface = false }: FilterTabsProps<T>) {
  const scroll = useRef<ScrollView>(null);
  const positions = useRef(new Map<T, { x: number; width: number }>());
  const [width, setWidth] = useState(0);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    const selected = positions.current.get(value);
    if (layout === 'row' && selected && width) {
      scroll.current?.scrollTo({ x: Math.max(0, selected.x - (width - selected.width) / 2), animated: !reduceMotion });
    }
  }, [value, width, layout, reduceMotion]);
  const choices = <View accessibilityRole={role} accessibilityLabel={label} style={[styles.track, layout === 'dates' && styles.dateTrack]}>
    {items.map(item => {
      const active = item.id === value;
      return <View key={item.id} onLayout={event => positions.current.set(item.id, event.nativeEvent.layout)} style={layout === 'dates' ? styles.dateSlot : undefined}>
        <MotionPressable accessibilityRole={role === 'radiogroup' ? 'radio' : 'tab'}
          accessibilityLabel={item.accessibilityLabel ?? item.label}
          accessibilityState={role === 'radiogroup' ? { checked: active } : { selected: active }}
          onPress={() => onChange(item.id)}>
          <Animated.View style={[styles.choice, surface && styles.surface, layout === 'dates' && styles.dateChoice,
            { backgroundColor: active ? (layout === 'dates' ? colors.liveSurface : 'rgba(68,68,74,0.94)') : surface ? 'rgba(36,36,40,0.94)' : colors.surfaceMuted,
              borderColor: active ? (layout === 'dates' ? colors.live : 'rgba(255,255,255,0.2)') : colors.border,
              transitionProperty: ['backgroundColor', 'borderColor'], transitionDuration: reduceMotion ? 0 : 140,
              transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1) }]}>
            <Text style={[styles.label, layout === 'dates' && styles.dateLabel, active && styles.active]}>{item.label}</Text>
            {item.caption ? <Text style={[styles.caption, active && styles.active]}>{item.caption}</Text> : null}
            {item.detail ? <Text style={[styles.caption, active && styles.active]}>{item.detail}</Text> : null}
          </Animated.View>
        </MotionPressable>
      </View>;
    })}
  </View>;
  return layout === 'dates' ? <View style={{ paddingHorizontal: inset }}>{choices}</View>
    : <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
      onLayout={event => setWidth(event.nativeEvent.layout.width)} style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, { paddingHorizontal: inset + 3 }]}>{choices}</ScrollView>;
}
const styles = StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 0 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 3 },
  track: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  dateTrack: { width: '100%', gap: 6, paddingVertical: 3 },
  dateSlot: { flex: 1, minWidth: 0 },
  choice: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderRadius: 999, justifyContent: 'center', alignItems: 'center', gap: 1 },
  surface: { backgroundColor: 'rgba(36,36,40,0.94)' },
  dateChoice: { minHeight: 76, paddingHorizontal: 2, paddingVertical: 9, borderRadius: 18, borderCurve: 'continuous' },
  label: { ...appFont('medium'), fontSize: 15, lineHeight: 20, color: colors.textSecondary, includeFontPadding: false },
  dateLabel: { ...appFont('bold'), fontSize: 22, lineHeight: 26, fontVariant: ['tabular-nums'] },
  caption: { ...appFont('medium'), fontSize: 12, lineHeight: 16, color: colors.textSecondary, includeFontPadding: false },
  active: { color: colors.text },
});
