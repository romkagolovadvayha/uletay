import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  cancelAllFavoriteNotifications,
  getNotificationPermissionStatus,
  loadNotificationsEnabled,
  NotificationPermissionStatus,
  requestNotificationPermissions,
  saveNotificationsEnabled,
} from '../utils/favoriteNotifications';

type NotificationSettingsContextValue = {
  enabled: boolean;
  permission: NotificationPermissionStatus;
  ready: boolean;
  busy: boolean;
  enableNotifications: () => Promise<boolean>;
  disableNotifications: () => Promise<void>;
  refresh: () => Promise<void>;
};

const NotificationSettingsContext = createContext<NotificationSettingsContextValue | null>(null);

export function NotificationSettingsProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermissionStatus>('undetermined');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

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

  const enableNotifications = useCallback(async (): Promise<boolean> => {
    setBusy(true);
    try {
      const granted = await requestNotificationPermissions();
      const status = await getNotificationPermissionStatus();
      setPermission(status);

      if (granted) {
        await saveNotificationsEnabled(true);
        setEnabled(true);
        return true;
      }

      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const disableNotifications = useCallback(async () => {
    setBusy(true);
    try {
      await saveNotificationsEnabled(false);
      await cancelAllFavoriteNotifications();
      setEnabled(false);
    } finally {
      setBusy(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      enabled,
      permission,
      ready,
      busy,
      enableNotifications,
      disableNotifications,
      refresh,
    }),
    [busy, disableNotifications, enableNotifications, enabled, permission, ready, refresh],
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
