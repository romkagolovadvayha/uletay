import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAppData } from '../context/DataContext';
import { SITE_URL } from '../seo/site';
import { setWebSeoAppData, syncWebSeo } from '../seo/syncWebSeo';

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
    setWebSeoAppData(data);

    const onPopState = () => syncWebSeo();
    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [data]);

  return null;
}
