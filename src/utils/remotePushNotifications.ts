import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../config/api';

const EXPO_PUSH_TOKEN_KEY = '@uletay_expo_push_token';
const PUSH_SUBSCRIPTION_URL = `${API_BASE_URL}/push/subscribe`;

type WebPushServerConfig = {
  webPushSupported: boolean;
  vapidPublicKey: string | null;
};

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

  const registration = await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
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

async function registerNativePush(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('broadcasts', {
      name: 'Новости фестиваля',
      description: 'Важные новости и объявления фестиваля',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 200, 250],
    });
  }
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    throw new Error('В конфигурации приложения отсутствует EAS projectId');
  }
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await postJson('POST', {
    platform: Platform.OS,
    token,
  });
  await AsyncStorage.setItem(EXPO_PUSH_TOKEN_KEY, token);
}

export async function syncRemotePushSubscription(): Promise<void> {
  if (Platform.OS === 'web') {
    await registerWebPush();
    return;
  }
  await registerNativePush();
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
  return Notifications.addPushTokenListener(() => {
    void registerNativePush().catch(() => {
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

  const token = await AsyncStorage.getItem(EXPO_PUSH_TOKEN_KEY);
  if (!token) {
    return;
  }
  try {
    await postJson('DELETE', { token });
  } finally {
    await AsyncStorage.removeItem(EXPO_PUSH_TOKEN_KEY);
  }
}
