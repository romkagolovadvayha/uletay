import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import type { FestivalActivityEvent } from './festivalActivityEvents';
import { API_BASE_URL } from '../config/api';

type ActivityModule = {
  syncEvents: (events: string) => Promise<void>;
  syncState?: (snapshot: string) => Promise<void>;
  configurePush?: (url: string, enabled: boolean) => Promise<void>;
};
type ActivityOptions = { enabled: boolean; favoriteKeys: string[]; authoritative: boolean };
const native = Platform.OS === 'web' ? null : requireOptionalNativeModule<ActivityModule>('FestivalActivity');
// Serialize writes so a slower previous sync cannot restore removed favorites.
let pending = Promise.resolve();
export function syncFestivalActivities(events: FestivalActivityEvent[], options: ActivityOptions = { enabled: events.length > 0, favoriteKeys: events.map(event => event.id), authoritative: true }): Promise<void> {
  pending = pending.catch(() => {}).then(async () => {
    if (!native) return;
    if (Platform.OS === 'ios' && native.syncState) await native.syncState(JSON.stringify({ ...options, events }));
    else await native.syncEvents(JSON.stringify(events));
    // This only queues native URLSession delivery. Network completion never
    // blocks starting or stopping the local ActivityKit card.
    if (Platform.OS === 'ios') await native.configurePush?.(API_BASE_URL, options.enabled);
  });
  return pending;
}
