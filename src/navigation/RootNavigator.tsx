import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { Suspense } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AdaptiveTabBar } from '../components/AdaptiveTabBar';
import { DeferredIonicons } from '../components/DeferredIonicons';
import { RadioTabIcon } from '../components/RadioTabIcon';
import { useIsTablet } from '../hooks/useIsTablet';
import { FestivalHomeScreen } from '../screens/FestivalHomeScreen';
import { FavoriteAddedToast } from '../components/FavoriteAddedToast';
import { MoreMenuProvider, useMoreMenu } from '../context/MoreMenuContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import {
  AutographStackParamList,
  HeadlinersStackParamList,
  MoreStackParamList,
  RootTabParamList,
  ScheduleStackParamList,
} from './types';
import {
  createFlatTabListeners,
  createNestedTabListeners,
} from './scheduleNavigation';
import { FestivalNavigationGuard } from './FestivalNavigationGuard';
import { lazyScreen } from './lazyScreen';

const LazyFavoriteNotificationHost = React.lazy(() =>
  import('../components/FavoriteNotificationHost').then((m) => ({
    default: m.FavoriteNotificationHost,
  })),
);

const LazyMoreMenuSheet = React.lazy(() =>
  import('../components/MoreMenuSheet').then((m) => ({
    default: m.MoreMenuSheet,
  })),
);

// Non-home screens load as separate web chunks (Metro async import splitting).
const FestivalMapScreen = lazyScreen(() =>
  import('../screens/FestivalMapScreen').then((m) => m.FestivalMapScreen),
);
const ScheduleMainScreen = lazyScreen(() =>
  import('../screens/ScheduleMainScreen').then((m) => m.ScheduleMainScreen),
);
const LiveDetailScreen = lazyScreen(() =>
  import('../screens/LiveDetailScreen').then((m) => m.LiveDetailScreen),
);
const FullScheduleScreen = lazyScreen(() =>
  import('../screens/FullScheduleScreen').then((m) => m.FullScheduleScreen),
);
const AutographsScreen = lazyScreen(() =>
  import('../screens/AutographsScreen').then((m) => m.AutographsScreen),
);
const AutographDetailScreen = lazyScreen(() =>
  import('../screens/AutographDetailScreen').then((m) => m.AutographDetailScreen),
);
const MyScheduleScreen = lazyScreen(() =>
  import('../screens/MyScheduleScreen').then((m) => m.MyScheduleScreen),
);
const HeadlinersScreen = lazyScreen(() =>
  import('../screens/HeadlinersScreen').then((m) => m.HeadlinersScreen),
);
const HeadlinerDetailScreen = lazyScreen(() =>
  import('../screens/HeadlinerDetailScreen').then((m) => m.HeadlinerDetailScreen),
);
const PlaylistScreen = lazyScreen(() =>
  import('../screens/PlaylistScreen').then((m) => m.PlaylistScreen),
);
const MorePlaceholderScreen = lazyScreen(() =>
  import('../screens/MorePlaceholderScreen').then((m) => m.MorePlaceholderScreen),
);
const FoodCourtScreen = lazyScreen(() =>
  import('../screens/FoodCourtScreen').then((m) => m.FoodCourtScreen),
);
const FoodCourtDetailScreen = lazyScreen(() =>
  import('../screens/FoodCourtDetailScreen').then((m) => m.FoodCourtDetailScreen),
);
const FestivalAboutScreen = lazyScreen(() =>
  import('../screens/FestivalAboutScreen').then((m) => m.FestivalAboutScreen),
);
const FestivalRulesScreen = lazyScreen(() =>
  import('../screens/FestivalRulesScreen').then((m) => m.FestivalRulesScreen),
);
const SettingsScreen = lazyScreen(() =>
  import('../screens/SettingsScreen').then((m) => m.SettingsScreen),
);
const LegalScreen = lazyScreen(() =>
  import('../screens/LegalScreen').then((m) => m.LegalScreen),
);

const Tab = createBottomTabNavigator<RootTabParamList>();
const ScheduleStack = createNativeStackNavigator<ScheduleStackParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();
const AutographStack = createNativeStackNavigator<AutographStackParamList>();
const HeadlinersStack = createNativeStackNavigator<HeadlinersStackParamList>();

const TAB_ICON_SIZE = 22;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabLabel: {
    ...typography.tabLabel,
    marginTop: 4,
    fontSize: 9,
  },
  tabletTabBar: {
    backgroundColor: colors.background,
    borderRightColor: colors.borderStrong,
    borderTopWidth: 0,
    boxShadow: 'none',
  },
});

function TabIcon({ name, color }: { name: string; color: string }) {
  return (
    <DeferredIonicons
      name={name as React.ComponentProps<typeof DeferredIonicons>['name']}
      size={TAB_ICON_SIZE}
      color={color}
    />
  );
}

function TabLabel({ color, children }: { color: string; children: string }) {
  return (
    <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
      {children}
    </Text>
  );
}

function ScheduleNavigator() {
  return (
    <ScheduleStack.Navigator
      initialRouteName="ScheduleMain"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <ScheduleStack.Screen name="ScheduleMain" component={ScheduleMainScreen} />
      <ScheduleStack.Screen name="LiveDetail" component={LiveDetailScreen} />
      <ScheduleStack.Screen name="FullSchedule" component={FullScheduleScreen} />
    </ScheduleStack.Navigator>
  );
}

function AutographNavigator() {
  return (
    <AutographStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AutographStack.Screen name="AutographsMain" component={AutographsScreen} />
      <AutographStack.Screen name="AutographDetail" component={AutographDetailScreen} />
    </AutographStack.Navigator>
  );
}

function HeadlinersNavigator() {
  return (
    <HeadlinersStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <HeadlinersStack.Screen name="HeadlinersMain" component={HeadlinersScreen} />
      <HeadlinersStack.Screen name="HeadlinerDetail" component={HeadlinerDetailScreen} />
    </HeadlinersStack.Navigator>
  );
}

function MoreNavigator() {
  return (
    <MoreStack.Navigator
      initialRouteName="MoreHome"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <MoreStack.Screen name="MoreHome" component={MorePlaceholderScreen} />
      <MoreStack.Screen name="FoodCourtMain" component={FoodCourtScreen} />
      <MoreStack.Screen name="FoodCourtDetail" component={FoodCourtDetailScreen} />
      <MoreStack.Screen name="FestivalAbout" component={FestivalAboutScreen} />
      <MoreStack.Screen name="FestivalRules" component={FestivalRulesScreen} />
      <MoreStack.Screen name="Settings" component={SettingsScreen} />
      <MoreStack.Screen name="Legal" component={LegalScreen} />
      <MoreStack.Screen name="HeadlinersMain" component={HeadlinersScreen} />
      <MoreStack.Screen name="HeadlinerDetail" component={HeadlinerDetailScreen} />
    </MoreStack.Navigator>
  );
}

function RootTabs() {
  const { open } = useMoreMenu();
  const isTablet = useIsTablet();

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      tabBar={(props) => <AdaptiveTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarPosition: isTablet ? 'left' : 'bottom',
        tabBarLabelPosition: isTablet ? 'beside-icon' : 'below-icon',
        tabBarStyle: isTablet ? styles.tabletTabBar : undefined,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabel: ({ color, children }) => (
          <TabLabel color={color}>{children}</TabLabel>
        ),
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={FestivalHomeScreen}
        listeners={({ navigation }) => createFlatTabListeners(navigation)}
        options={{
          title: 'Главная',
          tabBarIcon: ({ color }) => <TabIcon name="home-outline" color={color} />,
        }}
      />
      <Tab.Screen
        name="ScheduleTab"
        component={ScheduleNavigator}
        listeners={({ navigation }) => createNestedTabListeners(navigation, 'ScheduleTab')}
        options={{
          title: 'Расписание',
          tabBarIcon: ({ color }) => <TabIcon name="calendar-outline" color={color} />,
          popToTopOnBlur: true,
        }}
      />
      <Tab.Screen
        name="MapTab"
        component={FestivalMapScreen}
        listeners={({ navigation }) => createFlatTabListeners(navigation)}
        options={{
          title: 'Карта',
          tabBarIcon: ({ color }) => <TabIcon name="map-outline" color={color} />,
        }}
      />
      <Tab.Screen
        name="Autographs"
        component={AutographNavigator}
        listeners={({ navigation }) => createNestedTabListeners(navigation, 'Autographs')}
        options={{
          title: 'Автографы',
          tabBarIcon: ({ color }) => <TabIcon name="ticket-outline" color={color} />,
          popToTopOnBlur: true,
        }}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={MyScheduleScreen}
        listeners={({ navigation }) => createFlatTabListeners(navigation)}
        options={{
          title: 'Избранное',
          tabBarIcon: ({ color }) => <TabIcon name="star-outline" color={color} />,
        }}
      />
      <Tab.Screen
        name="HeadlinersTab"
        component={HeadlinersNavigator}
        listeners={({ navigation }) => createNestedTabListeners(navigation, 'HeadlinersTab')}
        options={{
          title: 'Хэдлайнеры',
          tabBarIcon: ({ color }) => <TabIcon name="mic-outline" color={color} />,
          popToTopOnBlur: true,
        }}
      />
      <Tab.Screen
        name="PlaylistTab"
        component={PlaylistScreen}
        listeners={({ navigation }) => createFlatTabListeners(navigation)}
        options={{
          title: 'Радио',
          tabBarIcon: ({ color }) => <RadioTabIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreNavigator}
        listeners={({ navigation }) =>
          isTablet
            ? createNestedTabListeners(navigation, 'MoreTab')
            : createNestedTabListeners(navigation, 'MoreTab', (event) => {
                event.preventDefault();
                open();
              })
        }
        options={{
          title: 'Ещё',
          tabBarIcon: ({ color }) => <TabIcon name="reorder-three-outline" color={color} />,
          popToTopOnBlur: true,
          tabBarButton: isTablet ? () => null : undefined,
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <MoreMenuProvider>
      <View style={styles.root}>
        <RootTabs />
        <FestivalNavigationGuard />
        <Suspense fallback={null}>
          <LazyMoreMenuSheet />
        </Suspense>
        <Suspense fallback={null}>
          <LazyFavoriteNotificationHost />
        </Suspense>
        <FavoriteAddedToast />
      </View>
    </MoreMenuProvider>
  );
}
