import { Platform } from 'react-native';

export async function ensureAndroidPushChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const Notifications = await import('expo-notifications');
  await Notifications.setNotificationChannelAsync('broadcasts', {
    name: 'Новости фестиваля',
    description: 'Важные новости и объявления фестиваля',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 200, 250],
  });
}
