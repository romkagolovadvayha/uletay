import {
  getPathFromState as getDefaultPathFromState,
  getStateFromPath as getDefaultStateFromPath,
} from '@react-navigation/native';
import type { LinkingOptions, PartialState, NavigationState } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { RootTabParamList } from './types';
import { getSafePushPath } from '../utils/pushNavigation';
import {
  addRuStorePushOpenedListener,
  getInitialRuStorePushPath,
} from '../utils/rustorePushNotifications';
import {
  decodeSeoRouteParam,
  encodeSeoRouteId,
} from '../seo/seoRouteUtils';

const prefixes = [
  Linking.createURL('/'),
  ...(Platform.OS === 'web' && typeof window !== 'undefined' ? [window.location.origin] : []),
];

let headlinersInMoreTab = true;

export function setHeadlinersInMoreTab(value: boolean) {
  headlinersInMoreTab = value;
}

function getHeadlinersStateFromPath(path: string): PartialState<NavigationState> | undefined {
  const normalized = path.replace(/\/+$/, '') || '/';
  const detailMatch = normalized.match(/^\/headliners\/([^/]+)$/);
  const tabName = headlinersInMoreTab ? 'MoreTab' : 'HeadlinersTab';

  if (detailMatch) {
    return {
      routes: [
        {
          name: tabName,
          state: {
            routes: [
              {
                name: 'HeadlinerDetail',
                params: { headlinerId: decodeSeoRouteParam(detailMatch[1]) },
              },
            ],
            index: 0,
          },
        },
      ],
      index: 0,
    };
  }

  if (normalized === '/headliners') {
    return {
      routes: [
        {
          name: tabName,
          state: {
            routes: [{ name: 'HeadlinersMain' }],
            index: 0,
          },
        },
      ],
      index: 0,
    };
  }

  return undefined;
}

function getActiveRoute(state: NavigationState | PartialState<NavigationState>) {
  let currentState: NavigationState | PartialState<NavigationState> = state;
  let active = currentState.routes[currentState.index ?? 0];

  while (active?.state) {
    currentState = active.state;
    active = currentState.routes[currentState.index ?? 0];
  }

  return active;
}

export const linking: LinkingOptions<RootTabParamList> = {
  prefixes,
  async getInitialURL() {
    const initialUrl = await Linking.getInitialURL();
    if (initialUrl || Platform.OS === 'web') {
      return initialUrl;
    }
    const response = Notifications.getLastNotificationResponse();
    const path = getSafePushPath(response?.notification.request.content.data?.url);
    if (path) {
      Notifications.clearLastNotificationResponse();
      return Linking.createURL(path);
    }
    const rustorePath = await getInitialRuStorePushPath();
    return rustorePath ? Linking.createURL(rustorePath) : null;
  },
  subscribe(listener) {
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => listener(url));
    const notificationSubscription =
      Platform.OS === 'web'
        ? null
        : Notifications.addNotificationResponseReceivedListener((response) => {
            const path = getSafePushPath(response.notification.request.content.data?.url);
            if (path) {
              listener(Linking.createURL(path));
            }
          });
    const rustoreSubscription = addRuStorePushOpenedListener((path) => {
      listener(Linking.createURL(path));
    });

    return () => {
      linkingSubscription.remove();
      notificationSubscription?.remove();
      rustoreSubscription?.remove();
    };
  },
  config: {
    screens: {
      HomeTab: '',
      MapTab: {
        path: 'map/:poiId?',
        parse: {
          poiId: decodeSeoRouteParam,
        },
        stringify: {
          poiId: encodeSeoRouteId,
        },
      },
      HelpTab: 'help',
      ScheduleTab: {
        path: 'schedule',
        screens: {
          ScheduleMain: '',
          LiveDetail: {
            path: 'live/:performanceId',
            parse: { performanceId: decodeSeoRouteParam },
            stringify: { performanceId: encodeSeoRouteId },
          },
          FullSchedule: {
            path: 'full/:stageId?',
            parse: { stageId: decodeSeoRouteParam },
            stringify: { stageId: encodeSeoRouteId },
          },
        },
      },
      Autographs: {
        path: 'autographs',
        screens: {
          AutographsMain: '',
          AutographDetail: {
            path: ':sessionId',
            parse: { sessionId: decodeSeoRouteParam },
            stringify: { sessionId: encodeSeoRouteId },
          },
        },
      },
      FavoritesTab: 'favorites',
      PlaylistTab: 'playlist',
      HeadlinersTab: {
        path: 'headliners',
        screens: {
          HeadlinersMain: '',
          HeadlinerDetail: {
            path: ':headlinerId',
            parse: { headlinerId: decodeSeoRouteParam },
            stringify: { headlinerId: encodeSeoRouteId },
          },
        },
      },
      MoreTab: {
        screens: {
          // MoreHome and headliners use custom path serialization below. Declaring
          // their paths here would conflict with HomeTab and HeadlinersTab.
          FoodCourtMain: 'foodcourt',
          FoodCourtDetail: {
            path: 'foodcourt/:vendorId',
            parse: { vendorId: decodeSeoRouteParam },
            stringify: { vendorId: encodeSeoRouteId },
          },
          FestivalAbout: 'about',
          FestivalRules: 'rules',
          Settings: 'settings',
          Legal: 'legal',
        },
      },
    },
  },
  getStateFromPath(path, options) {
    const normalized = path.replace(/\/+$/, '') || '/';
    if (normalized === '/more') {
      return {
        routes: [{ name: 'HomeTab' }],
        index: 0,
      };
    }

    const headlinersState = getHeadlinersStateFromPath(path);
    if (headlinersState) {
      return headlinersState;
    }
    return getDefaultStateFromPath(path, options);
  },
  getPathFromState(state, options) {
    const active = getActiveRoute(state);

    if (active?.name === 'MoreHome') {
      return '/';
    }
    if (active?.name === 'HeadlinersMain') {
      return '/headliners';
    }
    if (active?.name === 'HeadlinerDetail') {
      const headlinerId = (active.params as { headlinerId?: string } | undefined)?.headlinerId;
      return headlinerId
        ? `/headliners/${encodeURIComponent(encodeSeoRouteId(headlinerId))}`
        : '/headliners';
    }

    return getDefaultPathFromState(state, options);
  },
};
