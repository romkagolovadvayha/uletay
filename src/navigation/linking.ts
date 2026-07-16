import { getStateFromPath as getDefaultStateFromPath } from '@react-navigation/native';
import type { LinkingOptions, PartialState, NavigationState } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import type { RootTabParamList } from './types';

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
                params: { headlinerId: decodeURIComponent(detailMatch[1]) },
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

export const linking: LinkingOptions<RootTabParamList> = {
  prefixes,
  config: {
    screens: {
      HomeTab: '',
      MapTab: {
        path: 'map/:poiId?',
        parse: {
          poiId: (value: string) => value,
        },
      },
      ScheduleTab: {
        path: 'schedule',
        screens: {
          ScheduleMain: '',
          LiveDetail: 'live/:performanceId',
          FullSchedule: 'full/:stageId?',
        },
      },
      Autographs: {
        path: 'autographs',
        screens: {
          AutographsMain: '',
          AutographDetail: ':sessionId',
        },
      },
      FavoritesTab: 'favorites',
      PlaylistTab: 'playlist',
      HeadlinersTab: {
        path: 'headliners',
        screens: {
          HeadlinersMain: '',
          HeadlinerDetail: ':headlinerId',
        },
      },
      MoreTab: {
        screens: {
          // MoreHome is a phone sheet host — not a public URL (/more → black screen).
          FoodCourtMain: 'foodcourt',
          FoodCourtDetail: 'foodcourt/:vendorId',
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
};
