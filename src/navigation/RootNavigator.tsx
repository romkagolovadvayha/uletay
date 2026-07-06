import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { AdaptiveTabBar } from '../components/AdaptiveTabBar';
import { useIsTablet } from '../hooks/useIsTablet';
import { AutographDetailScreen } from '../screens/AutographDetailScreen';
import { AutographsScreen } from '../screens/AutographsScreen';
import { FoodCourtDetailScreen } from '../screens/FoodCourtDetailScreen';
import { FoodCourtScreen } from '../screens/FoodCourtScreen';
import { FestivalAboutScreen } from '../screens/FestivalAboutScreen';
import { FestivalRulesScreen } from '../screens/FestivalRulesScreen';
import { FestivalHomeScreen } from '../screens/FestivalHomeScreen';
import { FullScheduleScreen } from '../screens/FullScheduleScreen';
import { LiveDetailScreen } from '../screens/LiveDetailScreen';
import { MorePlaceholderScreen } from '../screens/MorePlaceholderScreen';
import { PlaylistScreen } from '../screens/PlaylistScreen';
import { MyScheduleScreen } from '../screens/MyScheduleScreen';
import { FestivalMapScreen } from '../screens/FestivalMapScreen';
import { ScheduleMainScreen } from '../screens/ScheduleMainScreen';
import { FavoriteAddedToast } from '../components/FavoriteAddedToast';
import { FavoriteNotificationHost } from '../components/FavoriteNotificationHost';
import { MoreMenuSheet } from '../components/MoreMenuSheet';
import { MoreMenuProvider, useMoreMenu } from '../context/MoreMenuContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import {
  AutographStackParamList,
  MoreStackParamList,
  RootTabParamList,
  ScheduleStackParamList,
} from './types';
import {
  createFlatTabListeners,
  createNestedTabListeners,
} from './scheduleNavigation';

const Tab = createBottomTabNavigator<RootTabParamList>();
const ScheduleStack = createNativeStackNavigator<ScheduleStackParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();
const AutographStack = createNativeStackNavigator<AutographStackParamList>();

const TAB_ICON_SIZE = 22;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: colors.background,
    borderTopColor: colors.borderStrong,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: Platform.OS === 'ios' ? 88 : 76,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabLabel: {
    ...typography.tabLabel,
    marginTop: 4,
    fontSize: 9,
  },
  tabItem: {
    paddingTop: 2,
  },
  tabletTabBar: {
    backgroundColor: colors.background,
    borderRightColor: colors.borderStrong,
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
});

function TabIcon({ name, color }: { name: string; color: string }) {
  return <Ionicons name={name as keyof typeof Ionicons.glyphMap} size={TAB_ICON_SIZE} color={color} />;
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
        tabBarStyle: isTablet ? styles.tabletTabBar : styles.tabBar,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarItemStyle: isTablet ? undefined : styles.tabItem,
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
        name="MapTab"
        component={FestivalMapScreen}
        listeners={({ navigation }) => createFlatTabListeners(navigation)}
        options={{
          title: 'Карта',
          tabBarIcon: ({ color }) => <TabIcon name="map-outline" color={color} />,
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
        name="PlaylistTab"
        component={PlaylistScreen}
        listeners={({ navigation }) => createFlatTabListeners(navigation)}
        options={{
          title: 'Плейлист',
          tabBarIcon: ({ color }) => <TabIcon name="radio-outline" color={color} />,
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
        <MoreMenuSheet />
        <FavoriteNotificationHost />
        <FavoriteAddedToast />
      </View>
    </MoreMenuProvider>
  );
}
