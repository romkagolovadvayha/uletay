import { Platform } from 'react-native';
import { navigationRef } from '../navigation/navigationRef';
import { defaultAppData } from '../storage/dataStore';
import type { AppData } from '../types';
import { applyWebSeo } from './applyWebSeo';
import { resolveSeoMeta, type NavState } from './routeSeo';

let latestAppData: AppData = defaultAppData;
let pendingRetry: ReturnType<typeof requestAnimationFrame> | null = null;

export function setWebSeoAppData(data: AppData) {
  latestAppData = data;
  syncWebSeo();
}

export function syncWebSeo(retry = 0) {
  if (Platform.OS !== 'web') {
    return;
  }

  if (!navigationRef.isReady()) {
    if (retry < 20) {
      if (pendingRetry != null) {
        cancelAnimationFrame(pendingRetry);
      }
      pendingRetry = requestAnimationFrame(() => {
        pendingRetry = null;
        syncWebSeo(retry + 1);
      });
    }
    return;
  }

  applyWebSeo(resolveSeoMeta(navigationRef.getRootState() as NavState, latestAppData));
}
