import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { useAppData } from '../context/DataContext';
import { useFavorites } from '../hooks/useFavorites';
import { useNotificationSettings } from '../context/NotificationSettingsContext';
import {
  FavoriteReminderPayload,
  getFavoriteEventsForReminders,
  loadNotifiedIds,
  saveNotifiedIds,
  shouldFireReminder,
  showReminderAlert,
  syncFavoriteNotifications,
} from '../utils/favoriteNotifications';

const POLL_MS = 30_000;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function useFavoriteNotifications() {
  const { data } = useAppData();
  const { favorites, isReady: favoritesReady } = useFavorites();
  const { enabled: notificationsEnabled, ready: settingsReady } = useNotificationSettings();
  const [activeReminder, setActiveReminder] = useState<FavoriteReminderPayload | null>(null);
  const [notifiedLoaded, setNotifiedLoaded] = useState(false);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!favoritesReady) {
      return;
    }

    void loadNotifiedIds().then((ids) => {
      notifiedIdsRef.current = ids;
      setNotifiedLoaded(true);
    });
  }, [favoritesReady]);

  useEffect(() => {
    if (!favoritesReady || !settingsReady) {
      return;
    }

    void syncFavoriteNotifications(favorites, data);

    if (!notifiedLoaded || !notificationsEnabled) {
      return;
    }

    const activeIds = new Set(
      getFavoriteEventsForReminders(favorites, data).map((event) => event.notificationId),
    );
    const pruned = new Set([...notifiedIdsRef.current].filter((id) => activeIds.has(id)));
    notifiedIdsRef.current = pruned;
    void saveNotifiedIds(pruned);
  }, [data, favorites, favoritesReady, notifiedLoaded, notificationsEnabled, settingsReady]);

  useEffect(() => {
    if (!favoritesReady || !notifiedLoaded || !settingsReady || !notificationsEnabled) {
      return;
    }

    const checkReminders = () => {
      const events = getFavoriteEventsForReminders(favorites, data);
      const now = new Date();

      for (const event of events) {
        if (!shouldFireReminder(event.date, event.startTime, now)) {
          continue;
        }
        if (notifiedIdsRef.current.has(event.notificationId)) {
          continue;
        }

        const payload: FavoriteReminderPayload = {
          id: event.notificationId,
          title: event.title,
          body: event.body,
        };

        notifiedIdsRef.current.add(event.notificationId);
        void saveNotifiedIds(notifiedIdsRef.current);
        void showReminderAlert(payload);
        setActiveReminder(payload);
      }
    };

    checkReminders();
    const timer = setInterval(checkReminders, POLL_MS);
    return () => clearInterval(timer);
  }, [data, favorites, favoritesReady, notifiedLoaded, notificationsEnabled, settingsReady]);

  const dismissReminder = () => {
    setActiveReminder(null);
  };

  return { activeReminder, dismissReminder };
}
