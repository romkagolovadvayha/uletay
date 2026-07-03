import type { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import type { RootTabParamList } from './types';

const prefixes = [
  Linking.createURL('/'),
  ...(Platform.OS === 'web' && typeof window !== 'undefined' ? [window.location.origin] : []),
];

export const linking: LinkingOptions<RootTabParamList> = {
  prefixes,
  config: {
    screens: {
      HomeTab: '',
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
      MoreTab: {
        screens: {
          MoreHome: 'more',
          FoodCourtMain: 'foodcourt',
          FoodCourtDetail: 'foodcourt/:vendorId',
          FestivalAbout: 'about',
        },
      },
    },
  },
};
