import { Ionicons } from '@expo/vector-icons';
import React, { createElement } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNotificationSettings } from '../context/NotificationSettingsContext';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { startWebNotificationPermissionRequest, NotificationPermissionStatus } from '../utils/favoriteNotifications';

function getDisabledSubtitle(permission: NotificationPermissionStatus): string {
  if (permission === 'unsupported') {
    return 'Нужен HTTPS или браузер с поддержкой уведомлений';
  }
  if (permission === 'denied') {
    return 'Разрешите уведомления в настройках устройства или браузера';
  }
  if (permission === 'in-app-only') {
    return 'В Safari на iPhone системные push недоступны во вкладке. Напомним внутри приложения, пока сайт открыт. Для push: «Поделиться» → «На экран Домой».';
  }
  return 'За 10 минут до выступления или автограф-сессии';
}

function getEnabledSubtitle(): string {
  if (Platform.OS === 'web') {
    return 'Push-новости и напоминания будут приходить, даже когда сайт закрыт. На iPhone требуется версия с экрана «Домой».';
  }
  return 'Push-новости фестиваля и напоминания за 10 минут до избранного события';
}

type EnableButtonProps = {
  busy: boolean;
  disabled: boolean;
  onEnable: (webPermissionPromise?: Promise<NotificationPermission> | null) => void;
};

function EnableButton({ busy, disabled, onEnable }: EnableButtonProps) {
  if (Platform.OS === 'web') {
    return createElement(
      'button',
      {
        type: 'button',
        disabled: disabled || busy,
        onClick: (event: MouseEvent) => {
          event.preventDefault();
          if (disabled || busy) {
            return;
          }
          const webPermissionPromise = startWebNotificationPermissionRequest();
          onEnable(webPermissionPromise);
        },
        style: {
          backgroundColor: colors.primary,
          borderRadius: radius.md,
          paddingTop: 12,
          paddingBottom: 12,
          paddingLeft: 16,
          paddingRight: 16,
          minHeight: 44,
          width: '100%',
          border: 'none',
          cursor: disabled || busy ? 'not-allowed' : 'pointer',
          opacity: disabled || busy ? 0.45 : 1,
          fontFamily: typography.button.fontFamily,
          fontSize: 14,
          fontWeight: '700',
          color: colors.primaryText,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
      busy
        ? createElement(ActivityIndicator, { size: 'small', color: colors.primaryText })
        : 'Включить уведомления',
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={() => onEnable(undefined)}
      style={({ pressed }) => [
        styles.enableButton,
        (disabled || busy) && styles.enableButtonDisabled,
        pressed && !busy && styles.pressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={colors.primaryText} />
      ) : (
        <Text style={styles.enableLabel}>Включить уведомления</Text>
      )}
    </Pressable>
  );
}

export function FavoriteNotificationsCard() {
  const { enabled, permission, ready, busy, feedback, enableNotifications, disableNotifications } =
    useNotificationSettings();

  const enableDisabled = busy || permission === 'denied' || permission === 'unsupported';

  if (!ready) {
    return null;
  }

  if (enabled) {
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <Ionicons name="notifications" size={22} color={colors.primary} />
          <View style={styles.textWrap}>
            <Text style={styles.title}>Push-уведомления включены</Text>
            <Text style={styles.subtitle}>{getEnabledSubtitle()}</Text>
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

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
        <View style={styles.textWrap}>
        <Text style={styles.title}>Push-уведомления</Text>
          <Text style={styles.subtitle}>{getDisabledSubtitle(permission)}</Text>
        </View>
      </View>
      <EnableButton
        busy={busy}
        disabled={enableDisabled}
        onEnable={(webPermissionPromise) => void enableNotifications(webPermissionPromise)}
      />
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
