import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAppData } from '../context/DataContext';
import { navigationRef } from '../navigation/navigationRef';
import { applyWebSeo } from '../seo/applyWebSeo';
import { resolveSeoMeta, type NavState } from '../seo/routeSeo';

export function WebSeoManager() {
  const { data } = useAppData();

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

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
