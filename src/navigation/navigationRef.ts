import { createNavigationContainerRef } from '@react-navigation/native';
import { resetAllNestedTabStacks } from './scheduleNavigation';
import { RootTabParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootTabParamList>();

export function navigateToMySchedule() {
  if (navigationRef.isReady()) {
    resetAllNestedTabStacks(navigationRef);
    navigationRef.navigate('FavoritesTab');
  }
}
