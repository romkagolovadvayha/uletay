import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { NavigationProp } from '@react-navigation/native';
import { getDefaultSidebarWidth } from '@react-navigation/elements';
import React, { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMoreMenu } from '../context/MoreMenuContext';
import {
  openAutographsMain,
  openScheduleTabMain,
  resetAllNestedTabStacks,
} from '../navigation/scheduleNavigation';
import { RootTabParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { appFont, typography } from '../theme/typography';

const MAIN_TAB_ROUTES: (keyof RootTabParamList)[] = [
  'HomeTab',
  'MapTab',
  'ScheduleTab',
  'Autographs',
  'FavoritesTab',
  'PlaylistTab',
];

type ExtraItem = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  isActive: boolean;
  onPress: () => void;
};

type SidebarItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
};

function SidebarItem({ icon, label, active, onPress }: SidebarItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        active && styles.itemActive,
        pressed && styles.itemPressed,
      ]}
    >
      <Ionicons
        name={icon}
        size={22}
        color={active ? colors.tabActive : colors.tabInactive}
      />
      <Text
        style={[styles.itemLabel, active && styles.itemLabelActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function TabletSidebar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { showNotifications } = useMoreMenu();
  const tabNavigation = navigation as unknown as NavigationProp<RootTabParamList>;

  const sidebarWidth = getDefaultSidebarWidth({ width });
  const currentRoute = state.routes[state.index];
  const currentTabName = currentRoute.name as keyof RootTabParamList;
  const moreNestedRoute =
    currentTabName === 'MoreTab' && currentRoute.state
      ? currentRoute.state.routes[currentRoute.state.index ?? 0]?.name
      : null;

  const mainItems = useMemo(
    () =>
      state.routes.filter((route) =>
        MAIN_TAB_ROUTES.includes(route.name as keyof RootTabParamList),
      ),
    [state.routes],
  );

  const handleMainTabPress = (routeName: keyof RootTabParamList) => {
    if (routeName === 'ScheduleTab') {
      openScheduleTabMain(tabNavigation);
      return;
    }
    if (routeName === 'Autographs') {
      openAutographsMain(tabNavigation);
      return;
    }
    if (routeName === 'MoreTab') {
      return;
    }
    resetAllNestedTabStacks(tabNavigation);
    tabNavigation.navigate(routeName);
  };

  const extraItems: ExtraItem[] = [
    {
      key: 'food-court',
      icon: 'restaurant-outline',
      label: 'Фудкорт',
      isActive: moreNestedRoute === 'FoodCourtMain' || moreNestedRoute === 'FoodCourtDetail',
      onPress: () => tabNavigation.navigate('MoreTab', { screen: 'FoodCourtMain' }),
    },
    {
      key: 'notifications',
      icon: 'notifications-outline',
      label: 'Оповещения',
      isActive: false,
      onPress: showNotifications,
    },
    {
      key: 'about',
      icon: 'information-circle-outline',
      label: 'О фестивале',
      isActive: moreNestedRoute === 'FestivalAbout',
      onPress: () => tabNavigation.navigate('MoreTab', { screen: 'FestivalAbout' }),
    },
  ];

  return (
    <View
      style={[
        styles.sidebar,
        {
          width: sidebarWidth,
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.lg,
          paddingLeft: insets.left + spacing.lg,
          paddingRight: spacing.lg,
        },
      ]}
    >
      <View style={styles.brand}>
        <Text style={styles.brandTitle}>УЛЕТАЙ</Text>
        <Text style={styles.brandSubtitle}>Фестиваль</Text>
      </View>

      <View style={styles.section}>
        {mainItems.map((route) => {
          const { options } = descriptors[route.key];
          const routeName = route.name as keyof RootTabParamList;
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : (options.title ?? route.name);

          const tabIcons: Record<keyof RootTabParamList, keyof typeof Ionicons.glyphMap> = {
            HomeTab: 'home-outline',
            MapTab: 'map-outline',
            ScheduleTab: 'calendar-outline',
            Autographs: 'ticket-outline',
            FavoritesTab: 'star-outline',
            PlaylistTab: 'radio-outline',
            MoreTab: 'reorder-three-outline',
          };
          const resolvedIcon = tabIcons[routeName];

          return (
            <SidebarItem
              key={route.key}
              icon={resolvedIcon}
              label={label}
              active={currentTabName === routeName}
              onPress={() => handleMainTabPress(routeName)}
            />
          );
        })}
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        {extraItems.map((item) => (
          <SidebarItem
            key={item.key}
            icon={item.icon}
            label={item.label}
            active={item.isActive}
            onPress={item.onPress}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    backgroundColor: colors.background,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.borderStrong,
  },
  brand: {
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.sm,
  },
  brandTitle: {
    ...typography.logoMain,
    color: colors.primary,
    fontSize: 28,
    lineHeight: 32,
  },
  brandSubtitle: {
    ...typography.logoTagline,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  section: {
    gap: spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderStrong,
    marginVertical: spacing.lg,
    marginHorizontal: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
  },
  itemActive: {
    backgroundColor: colors.surfaceMuted,
  },
  itemPressed: {
    opacity: 0.88,
  },
  itemLabel: {
    ...typography.body,
    ...appFont('medium'),
    color: colors.tabInactive,
    fontSize: 15,
    flex: 1,
  },
  itemLabelActive: {
    ...appFont('semiBold'),
    color: colors.text,
  },
});
