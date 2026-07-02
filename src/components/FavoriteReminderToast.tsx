import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { FavoriteReminderPayload } from '../utils/favoriteNotifications';
import { navigateToMySchedule } from '../navigation/navigationRef';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

const TAB_BAR_OFFSET = Platform.select({ ios: 96, android: 84, default: 84 });
const AUTO_HIDE_MS = 8000;

type Props = {
  reminder: FavoriteReminderPayload | null;
  onDismiss: () => void;
};

export function FavoriteReminderToast({ reminder, onDismiss }: Props) {
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
    navigateToMySchedule();
  };

  return (
    <View pointerEvents="box-none" style={styles.host}>
      <View style={styles.toast}>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{reminder.title}</Text>
          <Text style={styles.body}>{reminder.body}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={handleNavigate}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>МОЁ РАСПИСАНИЕ</Text>
        </Pressable>
      </View>
    </View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  textWrap: {
    gap: 4,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.primary,
    fontSize: 11,
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
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    ...typography.button,
    color: colors.primaryText,
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
