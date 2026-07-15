import { NavigatorScreenParams } from '@react-navigation/native';
import { StageId } from '../types';

export type ScheduleStackParamList = {
  ScheduleMain: undefined;
  LiveDetail: { performanceId: string };
  FullSchedule: { stageId?: StageId } | undefined;
};

export type AutographStackParamList = {
  AutographsMain: undefined;
  AutographDetail: { sessionId: string };
};

export type MoreStackParamList = {
  MoreHome: undefined;
  FoodCourtMain: undefined;
  FoodCourtDetail: { vendorId: string };
  FestivalAbout: undefined;
  FestivalRules: undefined;
  Settings: undefined;
  Legal: undefined;
  HeadlinersMain: undefined;
  HeadlinerDetail: { headlinerId: string };
};

export type HeadlinersStackParamList = {
  HeadlinersMain: undefined;
  HeadlinerDetail: { headlinerId: string };
};

export type RootTabParamList = {
  HomeTab: undefined;
  MapTab: { poiId?: string } | undefined;
  ScheduleTab: NavigatorScreenParams<ScheduleStackParamList>;
  Autographs: NavigatorScreenParams<AutographStackParamList>;
  FavoritesTab: undefined;
  PlaylistTab: undefined;
  HeadlinersTab: NavigatorScreenParams<HeadlinersStackParamList>;
  MoreTab: NavigatorScreenParams<MoreStackParamList>;
};

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- React Navigation module augmentation
    interface RootParamList extends RootTabParamList {}
  }
}
