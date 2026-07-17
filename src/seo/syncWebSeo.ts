import { Platform } from 'react-native';
import { navigationRef } from '../navigation/navigationRef';
import { defaultAppData } from '../storage/dataStore';
import type { AppData } from '../types';
import { applyWebSeo } from './applyWebSeo';
import { resolveSeoMeta, type NavState, type SeoMeta } from './routeSeo';

let latestAppData: AppData = defaultAppData;
let playlistNowPlayingTitle: string | null = null;
let pendingRetry: ReturnType<typeof requestAnimationFrame> | null = null;

export function setWebSeoAppData(data: AppData) {
  latestAppData = data;
  syncWebSeo();
}

/** Overrides the browser tab title while Playlist is focused and a track is known. */
export function setPlaylistNowPlayingTitle(title: string | null) {
  const next = title?.trim() || null;
  if (playlistNowPlayingTitle === next) {
    return;
  }
  playlistNowPlayingTitle = next;
  syncWebSeo();
}

function withPlaylistTitleOverride(meta: SeoMeta, state: NavState | undefined): SeoMeta {
  if (!playlistNowPlayingTitle || !state) {
    return meta;
  }

  const active = state.routes[state.index ?? 0];
  if (active?.name !== 'PlaylistTab') {
    return meta;
  }

  return { ...meta, title: playlistNowPlayingTitle };
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

  const state = navigationRef.getRootState() as NavState;
  applyWebSeo(withPlaylistTitleOverride(resolveSeoMeta(state, latestAppData), state));
}
