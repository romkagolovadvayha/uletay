import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { appFont } from '../theme/typography';
import { MotionPressable } from './MotionPressable';
import type { LiquidDialogProps, LiquidSelectProps } from './LiquidDialog.types';

// A shared presentation matches the custom dark design chosen for all platforms.
export function LiquidDialog({ open, onClose, title, description, children, actions = [], variant = 'alert' }: LiquidDialogProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const sheet = variant !== 'alert';
  return <Modal visible={open} transparent statusBarTranslucent animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={onClose}>
    <View style={[styles.backdrop, { paddingTop: insets.top + 16, paddingBottom: Math.max(16, insets.bottom) }, sheet && styles.sheetPosition]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Закрыть окно" style={StyleSheet.absoluteFill} onPress={onClose} />
      <View accessibilityViewIsModal style={[styles.panel, sheet && styles.sheet, { maxHeight: height - insets.top - insets.bottom - 32 }]}>
        {sheet ? <View style={styles.handle} /> : null}
        <View style={styles.header}>
          <Text accessibilityRole="header" style={[styles.title, sheet && styles.sheetTitle]}>{title}</Text>
          {sheet ? <MotionPressable accessibilityLabel="Закрыть" accessibilityRole="button" onPress={onClose} style={styles.close}><Ionicons name="close" size={22} color={colors.textSecondary} /></MotionPressable> : null}
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" bounces={false} style={styles.body} contentContainerStyle={styles.bodyContent}>
          {description ? <Text style={styles.description}>{description}</Text> : null}
          {children}
        </ScrollView>
        {actions.length ? <View style={styles.actions}>{actions.map(action => <MotionPressable key={action.label} accessibilityRole="button"
          disabled={action.disabled} accessibilityState={{ disabled: Boolean(action.disabled) }} onPress={action.onPress}
          style={[styles.action, action.tone === 'primary' && styles.primary, action.disabled && styles.disabled]}>
          <Text style={[styles.actionLabel, action.tone === 'primary' && styles.primaryLabel, action.tone === 'destructive' && styles.destructive]}>{action.label}</Text>
        </MotionPressable>)}</View> : null}
      </View>
    </View>
  </Modal>;
}

export function LiquidSelect({ open, onClose, title, value, options, onChange }: LiquidSelectProps) {
  return <LiquidDialog open={open} onClose={onClose} title={title} variant="popover">
    <View accessibilityRole="radiogroup" accessibilityLabel={title} style={styles.options}>
      {options.map(option => <MotionPressable key={option.id} accessibilityRole="radio" accessibilityState={{ checked: option.id === value }}
        onPress={() => { onChange(option.id); onClose(); }} style={[styles.option, option.id === value && styles.optionSelected]}>
        <Text style={styles.optionLabel}>{option.label}</Text>
        {option.id === value ? <Ionicons name="checkmark" size={22} color={colors.primary} /> : null}
      </MotionPressable>)}
    </View>
  </LiquidDialog>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.56)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  sheetPosition: { justifyContent: 'flex-end' },
  panel: { width: '100%', maxWidth: 360, backgroundColor: 'rgba(38,38,42,0.98)', borderRadius: 30, borderCurve: 'continuous', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', overflow: 'hidden', padding: 16 },
  sheet: { maxWidth: 560, borderRadius: 32, paddingTop: 8 },
  handle: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.24)', marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, paddingVertical: 12 },
  title: { ...appFont('semiBold'), fontSize: 20, lineHeight: 26, color: colors.text, textAlign: 'center', flex: 1 },
  sheetTitle: { ...appFont('bold'), fontSize: 24, lineHeight: 30, textAlign: 'left' },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  body: { flexGrow: 0, flexShrink: 1 },
  bodyContent: { paddingBottom: 8, gap: 12 },
  description: { ...appFont('regular'), fontSize: 15, lineHeight: 21, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 8 },
  actions: { gap: 8, marginTop: 12 },
  action: { minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.09)', paddingHorizontal: 16, paddingVertical: 12 },
  actionLabel: { ...appFont('semiBold'), fontSize: 17, lineHeight: 22, color: colors.text, textAlign: 'center' },
  primary: { backgroundColor: colors.primary },
  primaryLabel: { color: colors.primaryText },
  destructive: { color: colors.live },
  disabled: { opacity: 0.45 },
  options: { gap: 4, padding: 2 },
  option: { minHeight: 52, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionSelected: { backgroundColor: 'rgba(255,255,255,0.08)' },
  optionLabel: { ...appFont('medium'), fontSize: 17, lineHeight: 23, color: colors.text, flex: 1 },
});
