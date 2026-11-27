import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
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
import { syncFestivalActivities } from '../utils/festivalActivity';

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
  const settingsRevision = useRef(0);

  const refresh = useCallback(async () => {
    const revision = settingsRevision.current;
    const [stored, status] = await Promise.all([loadNotificationsEnabled(), getNotificationPermissionStatus()]);
    if (revision !== settingsRevision.current) return;
    setEnabled(stored);
    setPermission(status);
    setReady(true);
  }, []);

  useEffect(() => {
    let active = true;
    const update = () => {
      const revision = settingsRevision.current;
      return Promise.all([loadNotificationsEnabled(), getNotificationPermissionStatus()]).then(
        ([stored, status]) => {
          if (!active || revision !== settingsRevision.current) {
            return;
          }
          setEnabled(stored);
          setPermission(status);
          setReady(true);
        },
      ).catch(() => {
        if (active && revision === settingsRevision.current) {
          setReady(true);
          setFeedback('Не удалось проверить разрешение на уведомления. Попробуйте ещё раз.');
        }
      });
    };
    void update();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void update();
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const enableNotifications = useCallback(
    async (webPermissionPromise?: Promise<NotificationPermission> | null): Promise<boolean> => {
      settingsRevision.current += 1;
      setFeedback(null);
      setBusy(true);
      try {
        const granted = await requestNotificationPermissions(webPermissionPromise);
        const status = await getNotificationPermissionStatus();
        setPermission(status);

        if (granted) {
          // Local reminders and ActivityKit must be enabled while the app is
          // still in the foreground, even when the push server is unreachable.
          await saveNotificationsEnabled(true);
          settingsRevision.current += 1;
          setEnabled(true);
          setFeedback(null);
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
    settingsRevision.current += 1;
    setBusy(true);
    setFeedback(null);
    try {
      await saveNotificationsEnabled(false);
      settingsRevision.current += 1;
      setEnabled(false);
      await syncFestivalActivities([]).catch(() => undefined);
      await cancelAllFavoriteNotifications();
      void unregisterRemotePushSubscription().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!ready || !enabled || permission !== 'granted') {
      return;
    }
    let active = true;
    void syncRemotePushSubscription().catch(error => {
      if (active) {
        setFeedback(error instanceof Error ? error.message : 'Не удалось зарегистрировать удалённые push.');
      }
    });
    return () => { active = false; };
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
