import { NavigatorScreenParams } from '@react-navigation/native';
import { StageId } from '../types';

export type FoodCourtStackParamList = {
  FoodCourtMain: undefined;
  FoodCourtDetail: { vendorId: string };
};

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
};

export type RootTabParamList = {
  HomeTab: undefined;
  ScheduleTab: NavigatorScreenParams<ScheduleStackParamList>;
  Autographs: NavigatorScreenParams<AutographStackParamList>;
  FavoritesTab: undefined;
  FoodCourt: NavigatorScreenParams<FoodCourtStackParamList>;
  MoreTab: NavigatorScreenParams<MoreStackParamList>;
};

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- React Navigation module augmentation
    interface RootParamList extends RootTabParamList {}
  }
}
