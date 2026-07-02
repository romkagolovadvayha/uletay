import { createNavigationContainerRef } from '@react-navigation/native';
import { RootTabParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootTabParamList>();

export function navigateToMySchedule() {
  if (navigationRef.isReady()) {
    navigationRef.navigate('FavoritesTab');
  }
}
