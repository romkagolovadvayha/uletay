import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useAppData } from '../context/DataContext';
import { useFavorites } from '../hooks/useFavorites';
import { useNotificationSettings } from '../context/NotificationSettingsContext';
import {
  FavoriteReminderPayload,
  getFavoriteEventsForReminders,
  loadNotifiedIds,
  saveNotifiedIds,
  shouldFireReminder,
  syncFavoriteNotifications,
} from '../utils/favoriteNotifications';
import { syncWebPushFavorites } from '../utils/remotePushNotifications';

const POLL_MS = 30_000;

if (Platform.OS !== 'web') {
  void import('expo-notifications').then((Notifications) => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  });
}

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
    if (Platform.OS === 'web' && notificationsEnabled) {
      void syncWebPushFavorites(favorites).catch(() => {
        // The next app launch or favorite change retries the server sync.
      });
    }

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
          url: event.url,
        };

        notifiedIdsRef.current.add(event.notificationId);
        void saveNotifiedIds(notifiedIdsRef.current);
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
