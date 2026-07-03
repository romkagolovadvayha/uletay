import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { AutographDetailScreen } from '../screens/AutographDetailScreen';
import { AutographsScreen } from '../screens/AutographsScreen';
import { FestivalHomeScreen } from '../screens/FestivalHomeScreen';
import { FoodCourtDetailScreen } from '../screens/FoodCourtDetailScreen';
import { FoodCourtScreen } from '../screens/FoodCourtScreen';
import { FullScheduleScreen } from '../screens/FullScheduleScreen';
import { LiveDetailScreen } from '../screens/LiveDetailScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { MyScheduleScreen } from '../screens/MyScheduleScreen';
import { ScheduleMainScreen } from '../screens/ScheduleMainScreen';
import { FavoriteAddedToast } from '../components/FavoriteAddedToast';
import { FavoriteNotificationHost } from '../components/FavoriteNotificationHost';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import {
  AutographStackParamList,
  FoodCourtStackParamList,
  MoreStackParamList,
  RootTabParamList,
  ScheduleStackParamList,
} from './types';
import { popScheduleStackToMain } from './scheduleNavigation';

const Tab = createBottomTabNavigator<RootTabParamList>();
const ScheduleStack = createNativeStackNavigator<ScheduleStackParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();
const FoodCourtStack = createNativeStackNavigator<FoodCourtStackParamList>();
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

function FoodCourtNavigator() {
  return (
    <FoodCourtStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <FoodCourtStack.Screen name="FoodCourtMain" component={FoodCourtScreen} />
      <FoodCourtStack.Screen name="FoodCourtDetail" component={FoodCourtDetailScreen} />
    </FoodCourtStack.Navigator>
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
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <MoreStack.Screen name="MoreHome" component={MoreScreen} />
    </MoreStack.Navigator>
  );
}

export function RootNavigator() {
  return (
    <View style={styles.root}>
      <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarItemStyle: styles.tabItem,
        tabBarLabel: ({ color, children }) => (
          <TabLabel color={color}>{children}</TabLabel>
        ),
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={FestivalHomeScreen}
        options={{
          title: 'Главная',
          tabBarIcon: ({ color }) => <TabIcon name="home-outline" color={color} />,
        }}
      />
      <Tab.Screen
        name="ScheduleTab"
        component={ScheduleNavigator}
        listeners={({ navigation }) => ({
          blur: () => {
            popScheduleStackToMain(navigation);
          },
          tabPress: () => {
            popScheduleStackToMain(navigation);
          },
        })}
        options={{
          title: 'Расписание',
          tabBarIcon: ({ color }) => <TabIcon name="calendar-outline" color={color} />,
          popToTopOnBlur: true,
        }}
      />
      <Tab.Screen
        name="Autographs"
        component={AutographNavigator}
        options={{
          title: 'Автографы',
          tabBarIcon: ({ color }) => <TabIcon name="ticket-outline" color={color} />,
        }}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={MyScheduleScreen}
        options={{
          title: 'Избранное',
          tabBarIcon: ({ color }) => <TabIcon name="star-outline" color={color} />,
        }}
      />
      <Tab.Screen
        name="FoodCourt"
        component={FoodCourtNavigator}
        options={{
          title: 'Фудкорт',
          tabBarIcon: ({ color }) => <TabIcon name="restaurant-outline" color={color} />,
        }}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreNavigator}
        options={{
          title: 'Ещё',
          tabBarIcon: ({ color }) => <TabIcon name="reorder-three-outline" color={color} />,
        }}
      />
    </Tab.Navigator>
      <FavoriteNotificationHost />
      <FavoriteAddedToast />
    </View>
  );
}
