import React from 'react';
import { FavoriteReminderToast } from '../components/FavoriteReminderToast';
import { useFavoriteNotifications } from '../hooks/useFavoriteNotifications';

export function FavoriteNotificationHost() {
  const { activeReminder, dismissReminder } = useFavoriteNotifications();

  return <FavoriteReminderToast reminder={activeReminder} onDismiss={dismissReminder} />;
}
