import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
  useReducedMotion,
} from 'react-native-reanimated';
import * as Linking from 'expo-linking';
import { FavoriteReminderPayload } from '../utils/favoriteNotifications';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { MotionPressable } from './MotionPressable';

const TAB_BAR_OFFSET = Platform.select({ ios: 96, android: 84, default: 84 });
const AUTO_HIDE_MS = 8000;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const TOAST_ENTER = FadeInDown.duration(220).easing(EASE_OUT);
const TOAST_EXIT = FadeOutDown.duration(170).easing(EASE_OUT);
const REDUCED_TOAST_ENTER = FadeIn.duration(160).easing(EASE_OUT);
const REDUCED_TOAST_EXIT = FadeOut.duration(120).easing(EASE_OUT);

type Props = {
  reminder: FavoriteReminderPayload | null;
  onDismiss: () => void;
};

export function FavoriteReminderToast({ reminder, onDismiss }: Props) {
  const reduceMotion = useReducedMotion();

  React.useEffect(() => {
    if (!reminder) {
      return;
    }

    const timer = setTimeout(() => {
      onDismiss();
    }, AUTO_HIDE_MS);

    return () => clearTimeout(timer);
  }, [onDismiss, reminder]);

  if (!reminder) {
    return null;
  }

  const handleNavigate = () => {
    onDismiss();
    void Linking.openURL(Linking.createURL(reminder.url));
  };

  return (
    <Animated.View
      style={[styles.host, { pointerEvents: 'box-none' }]}
      accessibilityLiveRegion="polite"
      entering={reduceMotion ? REDUCED_TOAST_ENTER : TOAST_ENTER}
      exiting={reduceMotion ? REDUCED_TOAST_EXIT : TOAST_EXIT}
    >
      <View style={styles.toast}>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{reminder.title}</Text>
          <Text style={styles.body}>{reminder.body}</Text>
        </View>
        <MotionPressable
          accessibilityRole="button"
          onPress={handleNavigate}
          style={styles.button}
        >
          <Text style={styles.buttonText}>ОТКРЫТЬ СОБЫТИЕ</Text>
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
    zIndex: 99,
  },
  toast: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.35)',
    elevation: 8,
  },
  textWrap: {
    gap: 4,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.primary,
    fontSize: 12,
    letterSpacing: 0.6,
  },
  body: {
    ...typography.body,
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  buttonText: {
    ...typography.button,
    color: colors.primaryText,
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
