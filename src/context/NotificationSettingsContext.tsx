import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  cancelAllFavoriteNotifications,
  getNotificationPermissionStatus,
  loadNotificationsEnabled,
  NotificationPermissionStatus,
  requestNotificationPermissions,
  saveNotificationsEnabled,
} from '../utils/favoriteNotifications';
import {
  addRemotePushTokenRefreshListener,
  syncRemotePushSubscription,
  unregisterRemotePushSubscription,
} from '../utils/remotePushNotifications';

type NotificationSettingsContextValue = {
  enabled: boolean;
  permission: NotificationPermissionStatus;
  ready: boolean;
  busy: boolean;
  feedback: string | null;
  enableNotifications: (webPermissionPromise?: Promise<NotificationPermission> | null) => Promise<boolean>;
  disableNotifications: () => Promise<void>;
  refresh: () => Promise<void>;
};

const NotificationSettingsContext = createContext<NotificationSettingsContextValue | null>(null);

function getEnableFailureMessage(status: NotificationPermissionStatus): string {
  if (status === 'denied') {
    return 'Доступ запрещён. Разрешите уведомления в настройках браузера или устройства.';
  }
  if (status === 'unsupported') {
    return 'Уведомления недоступны. Откройте сайт по HTTPS или используйте другой браузер.';
  }
  if (status === 'in-app-only') {
    return 'Системные уведомления недоступны в этой вкладке. Напоминания будут внутри приложения.';
  }
  return 'Не удалось включить уведомления. Попробуйте ещё раз.';
}

export function NotificationSettingsProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermissionStatus>('undetermined');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [stored, status] = await Promise.all([loadNotificationsEnabled(), getNotificationPermissionStatus()]);
    setEnabled(stored);
    setPermission(status);
    setReady(true);
  }, []);

  useEffect(() => {
    let active = true;

    void Promise.all([loadNotificationsEnabled(), getNotificationPermissionStatus()]).then(
      ([stored, status]) => {
        if (!active) {
          return;
        }
        setEnabled(stored);
        setPermission(status);
        setReady(true);
      },
    );

    return () => {
      active = false;
    };
  }, []);

  const enableNotifications = useCallback(
    async (webPermissionPromise?: Promise<NotificationPermission> | null): Promise<boolean> => {
      setFeedback(null);
      setBusy(true);
      try {
        const granted = await requestNotificationPermissions(webPermissionPromise);
        const status = await getNotificationPermissionStatus();
        setPermission(status);

        if (granted) {
          let remotePushWarning: string | null = null;
          if (status === 'granted') {
            try {
              await syncRemotePushSubscription();
            } catch (error) {
              remotePushWarning =
                error instanceof Error
                  ? error.message
                  : 'Не удалось зарегистрировать удалённые push.';
            }
          }
          await saveNotificationsEnabled(true);
          setEnabled(true);
          setFeedback(remotePushWarning);
          return true;
        }

        setFeedback(getEnableFailureMessage(status));
        return false;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
        setFeedback(`Не удалось подключить push: ${message}`);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const disableNotifications = useCallback(async () => {
    setBusy(true);
    setFeedback(null);
    try {
      await saveNotificationsEnabled(false);
      await cancelAllFavoriteNotifications();
      await unregisterRemotePushSubscription().catch(() => undefined);
      setEnabled(false);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!ready || !enabled || permission !== 'granted') {
      return;
    }
    void syncRemotePushSubscription().catch(() => {
      // Сохраняем локальные напоминания и повторим регистрацию при следующем запуске.
    });
  }, [enabled, permission, ready]);

  useEffect(() => {
    if (!ready || !enabled || permission !== 'granted') {
      return;
    }
    const subscription = addRemotePushTokenRefreshListener();
    return () => subscription?.remove();
  }, [enabled, permission, ready]);

  const value = useMemo(
    () => ({
      enabled,
      permission,
      ready,
      busy,
      feedback,
      enableNotifications,
      disableNotifications,
      refresh,
    }),
    [busy, disableNotifications, enableNotifications, enabled, feedback, permission, ready, refresh],
  );

  return (
    <NotificationSettingsContext.Provider value={value}>{children}</NotificationSettingsContext.Provider>
  );
}

export function useNotificationSettings(): NotificationSettingsContextValue {
  const context = useContext(NotificationSettingsContext);
  if (!context) {
    throw new Error('useNotificationSettings must be used within NotificationSettingsProvider');
  }
  return context;
}
