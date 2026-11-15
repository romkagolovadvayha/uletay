import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

// Cover legacy client-side links and development servers without nginx redirects.
export function FestivalAboutScreen() {
  useFocusEffect(useCallback(() => {
    window.location.replace(`/${window.location.search}${window.location.hash}`);
  }, []));

  return null;
}
