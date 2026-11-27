import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { useAppData } from '../context/DataContext';
import { useDemoMode } from '../context/DemoModeContext';
import { useFavorites } from './useFavorites';
import { useNotificationSettings } from '../context/NotificationSettingsContext';
import { buildFestivalActivityEvents } from '../utils/festivalActivityEvents';
import { syncFestivalActivities } from '../utils/festivalActivity';

export function useFestivalActivity() {
  const { data, dataSource, lastFetchedAt } = useAppData();
  const { favorites, isReady } = useFavorites();
  const { enabled, permission, ready } = useNotificationSettings();
  const demo = useDemoMode();
  useEffect(() => {
    if (Platform.OS === 'web' || !ready || !isReady || !demo.ready) return;
    const sync = () => {
      const allowed = enabled && permission === 'granted' && demo.mode === 'real';
      const events = allowed
        ? buildFestivalActivityEvents(favorites, data) : [];
      void syncFestivalActivities(events, {
        enabled: allowed, favoriteKeys: allowed ? favorites : [],
        authoritative: dataSource === 'remote' && lastFetchedAt !== null && Date.now() - lastFetchedAt < 60_000,
      }).catch(error => {
        if (__DEV__) console.warn('Festival activity sync failed', error);
      });
    };
    sync();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') sync(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') sync(); }, 30_000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, [data, dataSource, lastFetchedAt, favorites, enabled, permission, ready, isReady, demo.mode, demo.ready]);
}
