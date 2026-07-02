import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData } from '../types';
import { FavoriteType } from './favoriteKeys';
import { parseDateTime } from './scheduleHelpers';

const REMINDER_LEAD_MS = 10 * 60 * 1000;
const NOTIFIED_STORAGE_KEY = '@uletay_favorite_notified';
export const NOTIFICATIONS_ENABLED_KEY = '@uletay_notifications_enabled';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export type FavoriteReminderPayload = {
  id: string;
  title: string;
  body: string;
};

export function getFavoriteNotificationId(type: FavoriteType, id: string): string {
  return `fav-${type}-${id}`;
}

export function getReminderTriggerDate(date: string, startTime: string): Date {
  const start = parseDateTime(date, startTime);
  return new Date(start.getTime() - REMINDER_LEAD_MS);
}

function parseFavoriteKey(key: string): { type: FavoriteType; id: string } | null {
  const [prefix, id] = key.split(':');
  if (!id) {
    return null;
  }
  if (prefix === 'perf') {
    return { type: 'performance', id };
  }
  if (prefix === 'auto') {
    return { type: 'autograph', id };
  }
  return null;
}

export function getFavoriteEventsForReminders(favorites: string[], data: AppData) {
  return favorites
    .map((key) => {
      const parsed = parseFavoriteKey(key);
      if (!parsed || parsed.type === 'food') {
        return null;
      }

      if (parsed.type === 'performance') {
        const performance = data.schedule.find((item) => item.id === parsed.id);
        if (!performance) {
          return null;
        }
        return {
          notificationId: getFavoriteNotificationId('performance', performance.id),
          date: performance.date,
          startTime: performance.startTime,
          title: 'Скоро выступление',
          body: `Через 10 минут: ${performance.artist} (${performance.startTime})`,
        };
      }

      const session = data.autographs.find((item) => item.id === parsed.id);
      if (!session) {
        return null;
      }
      return {
        notificationId: getFavoriteNotificationId('autograph', session.id),
        date: session.date,
        startTime: session.startTime,
        title: 'Скоро автограф-сессия',
        body: `Через 10 минут: ${session.artist} (${session.startTime})`,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

export async function loadNotificationsEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function saveNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? '1' : '0');
}

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    if (Notification.permission === 'granted') {
      return 'granted';
    }
    if (Notification.permission === 'denied') {
      return 'denied';
    }
    return 'undetermined';
  }

  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return 'granted';
  }
  if (settings.canAskAgain === false) {
    return 'denied';
  }
  return 'undetermined';
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    if (Notification.permission === 'granted') {
      return true;
    }
    if (Notification.permission === 'denied') {
      return false;
    }
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

/** @deprecated use requestNotificationPermissions after user opt-in */
export async function ensureNotificationPermissions(): Promise<boolean> {
  return requestNotificationPermissions();
}

export async function cancelAllFavoriteNotifications(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.identifier.startsWith('fav-'))
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

export async function syncFavoriteNotifications(favorites: string[], data: AppData): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  const enabled = await loadNotificationsEnabled();
  if (!enabled) {
    await cancelAllFavoriteNotifications();
    return;
  }

  const permission = await getNotificationPermissionStatus();
  if (permission !== 'granted') {
    return;
  }

  const events = getFavoriteEventsForReminders(favorites, data);
  const activeIds = new Set(events.map((event) => event.notificationId));
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  await Promise.all(
    scheduled
      .filter((item) => item.identifier.startsWith('fav-') && !activeIds.has(item.identifier))
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );

  const now = Date.now();

  await Promise.all(
    events.map(async (event) => {
      const triggerDate = getReminderTriggerDate(event.date, event.startTime);
      if (triggerDate.getTime() <= now) {
        await Notifications.cancelScheduledNotificationAsync(event.notificationId);
        return;
      }

      await Notifications.scheduleNotificationAsync({
        identifier: event.notificationId,
        content: {
          title: event.title,
          body: event.body,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });
    }),
  );
}

export async function loadNotifiedIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFIED_STORAGE_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export async function saveNotifiedIds(ids: Set<string>): Promise<void> {
  await AsyncStorage.setItem(NOTIFIED_STORAGE_KEY, JSON.stringify([...ids]));
}

export function shouldFireReminder(
  date: string,
  startTime: string,
  now = new Date(),
): boolean {
  const triggerAt = getReminderTriggerDate(date, startTime).getTime();
  const startAt = parseDateTime(date, startTime).getTime();
  const nowMs = now.getTime();
  return nowMs >= triggerAt && nowMs < startAt;
}

export async function showReminderAlert(payload: FavoriteReminderPayload): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(payload.title, { body: payload.body });
    }
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: payload.title,
      body: payload.body,
      sound: true,
    },
    trigger: null,
  });
}
