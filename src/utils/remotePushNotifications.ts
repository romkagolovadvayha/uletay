import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../config/api';
import {
  addRuStorePushTokenListener,
  deleteRuStorePushToken,
  getRuStorePushToken,
  isRuStorePushBuild,
} from './rustorePushNotifications';

const EXPO_PUSH_TOKEN_KEY = '@uletay_expo_push_token';
const RUSTORE_PUSH_TOKEN_KEY = '@uletay_rustore_push_token';
const PUSH_SUBSCRIPTION_URL = `${API_BASE_URL}/push/subscribe`;

type WebPushServerConfig = {
  webPushSupported: boolean;
  vapidPublicKey: string | null;
};

function hasAndroidFirebaseConfig(): boolean {
  const androidConfig = Constants.expoConfig?.android as
    | { googleServicesFile?: string }
    | undefined;
  return Boolean(androidConfig?.googleServicesFile);
}

function base64UrlToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }
  return bytes;
}

async function postJson(method: 'POST' | 'DELETE', body: unknown): Promise<void> {
  const response = await fetch(PUSH_SUBSCRIPTION_URL, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || `Push API HTTP ${response.status}`);
  }
}

async function getOrCreateWebPushSubscription(): Promise<PushSubscription> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    throw new Error('Web Push не поддерживается этим браузером');
  }
  const configResponse = await fetch(PUSH_SUBSCRIPTION_URL, {
    headers: { Accept: 'application/json' },
  });
  if (!configResponse.ok) {
    throw new Error(`Push API HTTP ${configResponse.status}`);
  }
  const serverConfig = (await configResponse.json()) as WebPushServerConfig;
  if (!serverConfig.webPushSupported || !serverConfig.vapidPublicKey) {
    throw new Error('Web Push пока не настроен на сервере');
  }

  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(serverConfig.vapidPublicKey),
    }));
  return subscription;
}

async function registerWebPush(favoriteKeys?: string[]): Promise<void> {
  const subscription = await getOrCreateWebPushSubscription();
  await postJson('POST', {
    platform: 'web',
    subscription: subscription.toJSON(),
    ...(favoriteKeys ? { favoriteKeys } : {}),
  });
}

async function ensureAndroidPushChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('broadcasts', {
      name: 'Новости фестиваля',
      description: 'Важные новости и объявления фестиваля',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 200, 250],
    });
  }
}

async function unregisterStoredToken(
  storageKey: string,
  provider: 'expo' | 'rustore',
): Promise<void> {
  const token = await AsyncStorage.getItem(storageKey);
  if (!token) {
    return;
  }
  await postJson('DELETE', { provider, token });
  await AsyncStorage.removeItem(storageKey);
}

async function registerRuStorePushToken(token: string): Promise<void> {
  await postJson('POST', {
    platform: 'android',
    provider: 'rustore',
    token,
  });
  await AsyncStorage.setItem(RUSTORE_PUSH_TOKEN_KEY, token);
}

async function registerRuStorePush(): Promise<void> {
  await ensureAndroidPushChannel();
  if (Constants.appOwnership === 'expo') {
    throw new Error(
      'RuStore Push недоступен в Expo Go. Установите production-сборку приложения.',
    );
  }
  const token = await getRuStorePushToken();
  await registerRuStorePushToken(token);
  await unregisterStoredToken(EXPO_PUSH_TOKEN_KEY, 'expo').catch(() => undefined);
}

async function registerExpoPush(): Promise<void> {
  await ensureAndroidPushChannel();
  if (Platform.OS === 'android') {
    if (Constants.appOwnership === 'expo') {
      throw new Error(
        'В Expo Go удалённые push на Android недоступны. ' +
          'Локальные напоминания продолжат работать; для push установите development или production сборку.',
      );
    }
    if (!hasAndroidFirebaseConfig()) {
      throw new Error(
        'Удалённые push на Android пока не настроены: в сборке отсутствует google-services.json. ' +
          'Локальные напоминания продолжат работать; после добавления файла нужна новая сборка приложения.',
      );
    }
  }
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    throw new Error('В конфигурации приложения отсутствует EAS projectId');
  }
  let token: string;
  try {
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      Platform.OS === 'android' &&
      /Firebase|FirebaseApp|Messaging instance|google-services/i.test(message)
    ) {
      throw new Error(
        'Удалённые push на Android не инициализированы. Проверьте google-services.json, ' +
          'expo.android.googleServicesFile и пересоберите приложение.',
      );
    }
    throw error;
  }
  await postJson('POST', {
    platform: Platform.OS,
    provider: 'expo',
    token,
  });
  await AsyncStorage.setItem(EXPO_PUSH_TOKEN_KEY, token);
  await unregisterStoredToken(RUSTORE_PUSH_TOKEN_KEY, 'rustore').catch(() => undefined);
}

export async function syncRemotePushSubscription(): Promise<void> {
  if (Platform.OS === 'web') {
    await registerWebPush();
    return;
  }
  if (isRuStorePushBuild()) {
    await registerRuStorePush();
    return;
  }
  await registerExpoPush();
}

export async function syncWebPushFavorites(favoriteKeys: string[]): Promise<void> {
  if (Platform.OS !== 'web') {
    return;
  }
  await registerWebPush(favoriteKeys);
}

export function addRemotePushTokenRefreshListener(): { remove: () => void } | null {
  if (Platform.OS === 'web') {
    return null;
  }
  if (isRuStorePushBuild()) {
    return addRuStorePushTokenListener((token) => {
      void registerRuStorePushToken(token).catch(() => {
        // Повторная синхронизация произойдёт при следующем запуске приложения.
      });
    });
  }
  return Notifications.addPushTokenListener(() => {
    void registerExpoPush().catch(() => {
      // Повторная синхронизация произойдёт при следующем запуске приложения.
    });
  });
}

export async function unregisterRemotePushSubscription(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }
    const registration = await navigator.serviceWorker.getRegistration('/');
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) {
      return;
    }
    try {
      await postJson('DELETE', { endpoint: subscription.endpoint });
    } finally {
      await subscription.unsubscribe();
    }
    return;
  }

  const results = await Promise.allSettled([
    unregisterStoredToken(EXPO_PUSH_TOKEN_KEY, 'expo'),
    unregisterStoredToken(RUSTORE_PUSH_TOKEN_KEY, 'rustore'),
  ]);
  if (isRuStorePushBuild()) {
    await deleteRuStorePushToken().catch(() => undefined);
  }
  const failure = results.find((result) => result.status === 'rejected');
  if (failure?.status === 'rejected') {
    throw failure.reason;
  }
}
