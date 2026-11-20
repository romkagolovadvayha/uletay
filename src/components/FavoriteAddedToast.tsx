import { ios, webStyle } from '../theme/ios';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
  useReducedMotion,
} from 'react-native-reanimated';
import { useFavorites } from '../context/FavoritesContext';
import { navigateToMySchedule } from '../navigation/navigationRef';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { MotionPressable } from './MotionPressable';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {NATIVE_NAV_HEIGHT} from '../theme/native-festival';

const TAB_BAR_OFFSET = Platform.select({ ios: 96, android: 84, default: 116 });
const AUTO_HIDE_MS = 5000;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const TOAST_ENTER = FadeInDown.duration(220).easing(EASE_OUT);
const TOAST_EXIT = FadeOutDown.duration(170).easing(EASE_OUT);
const REDUCED_TOAST_ENTER = FadeIn.duration(160).easing(EASE_OUT);
const REDUCED_TOAST_EXIT = FadeOut.duration(120).easing(EASE_OUT);

export function FavoriteAddedToast() {
  const { addedToastVisible, hideAddedToast, storageError } = useFavorites();
  const reduceMotion = useReducedMotion();
  const insets=useSafeAreaInsets();

  useEffect(() => {
    if (!addedToastVisible) {
      return;
    }

    const timer = setTimeout(() => {
      hideAddedToast();
    }, AUTO_HIDE_MS);

    return () => clearTimeout(timer);
  }, [addedToastVisible, hideAddedToast]);

  if (!addedToastVisible) {
    return null;
  }

  const handleNavigate = () => {
    hideAddedToast();
    navigateToMySchedule();
  };

  return (
    <Animated.View
      nativeID="festival-favorite-toast"
      pointerEvents="box-none"
      style={[styles.host,Platform.OS!=='web'&&{bottom:NATIVE_NAV_HEIGHT+12+insets.bottom}]}
      accessibilityLiveRegion="polite"
      entering={reduceMotion ? REDUCED_TOAST_ENTER : TOAST_ENTER}
      exiting={reduceMotion ? REDUCED_TOAST_EXIT : TOAST_EXIT}
    >
      <View style={styles.toast}>
        <Text style={styles.message}>{storageError?'Сохранено на время сеанса: хранилище браузера недоступно':'Добавлено в избранное'}</Text>
        <MotionPressable
          accessibilityRole="button"
          onPress={handleNavigate}
          style={styles.button}
        >
          <Text style={styles.buttonText}>МОЁ ИЗБРАННОЕ</Text>
        </MotionPressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: spacing.screen,
    right: spacing.screen,
    bottom: TAB_BAR_OFFSET,
    alignItems: 'center',
    zIndex: 100,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    maxWidth: 420,
    shadowColor: colors.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    ...ios.glass,
  },
  message: {
    ...typography.body,
    color: colors.text,
    fontSize: 13,
    flexShrink: 1,
    ...ios.secondary,
    ...(Platform.OS!=='web'?{fontSize:11,lineHeight:16}:{}),
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...webStyle({ minHeight: 44, justifyContent: 'center' }),
  },
  buttonText: {
    ...typography.button,
    color: colors.primaryText,
    fontSize: 12,
    letterSpacing: 0.3,
    ...ios.caption,
    ...(Platform.OS!=='web'?{fontSize:10,lineHeight:14}:{}),
  },
});
