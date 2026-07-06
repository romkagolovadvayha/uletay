import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAppData } from '../context/DataContext';
import { navigationRef } from '../navigation/navigationRef';
import { applyWebSeo } from '../seo/applyWebSeo';
import { resolveSeoMeta, type NavState } from '../seo/routeSeo';
import { SITE_URL } from '../seo/site';

function redirectWwwToApex() {
  if (typeof window === 'undefined') {
    return;
  }

  const { hostname, pathname, search, hash } = window.location;
  if (!hostname.startsWith('www.')) {
    return;
  }

  const apexHost = hostname.slice(4);
  const target = `${SITE_URL.replace(/\/$/, '')}${pathname}${search}${hash}`;

  if (new URL(target).hostname !== apexHost) {
    return;
  }

  window.location.replace(target);
}

export function WebSeoManager() {
  const { data } = useAppData();

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    redirectWwwToApex();

    const updateSeo = () => {
      if (!navigationRef.isReady()) {
        return;
      }

      applyWebSeo(resolveSeoMeta(navigationRef.getRootState() as NavState, data));
    };

    updateSeo();

    const unsubscribe = navigationRef.addListener('state', updateSeo);
    return unsubscribe;
  }, [data]);

  return null;
}
