import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNotificationSettings } from '../context/NotificationSettingsContext';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { startWebNotificationPermissionRequest } from '../utils/favoriteNotifications';

export function FavoriteNotificationsCard() {
  const { enabled, permission, ready, busy, feedback, enableNotifications, disableNotifications } =
    useNotificationSettings();

  const handleEnable = () => {
    if (busy || permission === 'denied' || permission === 'unsupported') {
      return;
    }

    const webPermissionPromise =
      Platform.OS === 'web' ? startWebNotificationPermissionRequest() : undefined;

    void enableNotifications(webPermissionPromise);
  };

  if (!ready) {
    return null;
  }

  if (enabled) {
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <Ionicons name="notifications" size={22} color={colors.primary} />
          <View style={styles.textWrap}>
            <Text style={styles.title}>Уведомления включены</Text>
            <Text style={styles.subtitle}>
              {Platform.OS === 'web'
                ? 'Напомним за 10 минут, пока открыт сайт'
                : 'Напомним за 10 минут до избранного события'}
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void disableNotifications()}
          style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
        >
          {busy ? <ActivityIndicator size="small" color={colors.textSecondary} /> : null}
          <Text style={styles.linkText}>Отключить</Text>
        </Pressable>
      </View>
    );
  }

  const subtitle =
    permission === 'unsupported'
      ? 'Нужен HTTPS или браузер с поддержкой уведомлений'
      : permission === 'denied'
        ? 'Разрешите уведомления в настройках устройства или браузера'
        : 'За 10 минут до выступления или автограф-сессии';

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
        <View style={styles.textWrap}>
          <Text style={styles.title}>Напоминания об избранном</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={busy || permission === 'denied' || permission === 'unsupported'}
        onPress={handleEnable}
        style={({ pressed }) => [
          styles.enableButton,
          (busy || permission === 'denied' || permission === 'unsupported') && styles.enableButtonDisabled,
          pressed && !busy && styles.pressed,
        ]}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.primaryText} />
        ) : (
          <Text style={styles.enableLabel}>Включить уведомления</Text>
        )}
      </Pressable>
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  textWrap: {
    flex: 1,
    gap: 4,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.text,
    fontSize: 14,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  enableButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  enableButtonDisabled: {
    opacity: 0.45,
  },
  enableLabel: {
    ...typography.button,
    color: colors.primaryText,
    fontSize: 14,
  },
  feedback: {
    ...typography.body,
    color: colors.competition,
    fontSize: 12,
    lineHeight: 16,
  },
  linkButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  linkText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.9,
  },
});
