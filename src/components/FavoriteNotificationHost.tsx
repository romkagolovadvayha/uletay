import React from 'react';
import { FavoriteReminderToast } from '../components/FavoriteReminderToast';
import { useFavoriteNotifications } from '../hooks/useFavoriteNotifications';
import { useFestivalActivity } from '../hooks/useFestivalActivity';

export function FavoriteNotificationHost() {
  useFestivalActivity();
  const { activeReminder, dismissReminder } = useFavoriteNotifications();

  return <FavoriteReminderToast reminder={activeReminder} onDismiss={dismissReminder} />;
}
