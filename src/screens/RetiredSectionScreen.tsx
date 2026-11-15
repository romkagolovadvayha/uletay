import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { navigationRef } from '../navigation/navigationRef';

/** Old app links remain safe to open after their section has been retired. */
export function RetiredSectionScreen() {
  useFocusEffect(useCallback(() => {
    if (navigationRef.isReady()) navigationRef.navigate('HomeTab');
  }, []));
  return null;
}
