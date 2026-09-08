import { Ionicons } from '@expo/vector-icons';
import { DeferredIonicons } from './DeferredIonicons';
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
import { useFestivalActive } from '../hooks/useFestivalActive';
import {
  useHeadlinersInMoreTab,
  useMainTabContentFlags,
  useVisibleMainTabRoutes,
} from '../navigation/mainTabRoutes';
import {
  openAutographsMain,
  openHeadlinersMain,
  openScheduleTabMain,
  resetAllNestedTabStacks,
} from '../navigation/scheduleNavigation';
import { RootTabParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { appFont, typography } from '../theme/typography';
import { RadioTabIcon } from './RadioTabIcon';
import { webKeyboardActivationProps } from '../utils/webKeyboardActivation';

type ExtraItem = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  isActive: boolean;
  onPress: () => void;
};

type SidebarItemProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  iconNode?: React.ReactNode;
  label: string;
  active: boolean;
  onPress: () => void;
};

function SidebarItem({ icon, iconNode, label, active, onPress }: SidebarItemProps) {
  const color = active ? colors.tabActive : colors.tabInactive;

  return (
    <Pressable
      {...webKeyboardActivationProps(onPress)}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      aria-selected={active}
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        active && styles.itemActive,
        pressed && styles.itemPressed,
      ]}
    >
      {iconNode ?? (
        <DeferredIonicons
          name={icon ?? 'ellipse'}
          size={22}
          color={color}
        />
      )}
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
  const festivalActive = useFestivalActive();
  const mainTabRoutes = useVisibleMainTabRoutes();
  const headlinersInMore = useHeadlinersInMoreTab();
  const content = useMainTabContentFlags();
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
        mainTabRoutes.includes(route.name as keyof RootTabParamList),
      ),
    [mainTabRoutes, state.routes],
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
    if (routeName === 'HeadlinersTab') {
      openHeadlinersMain(tabNavigation);
      return;
    }
    if (routeName === 'MoreTab') {
      return;
    }
    resetAllNestedTabStacks(tabNavigation);
    tabNavigation.navigate(routeName);
  };

  const extraItems: ExtraItem[] = [
    ...(headlinersInMore
      ? [
          {
            key: 'headliners',
            icon: 'mic' as const,
            label: 'Хэдлайнеры',
            isActive:
              moreNestedRoute === 'HeadlinersMain' || moreNestedRoute === 'HeadlinerDetail',
            onPress: () => openHeadlinersMain(tabNavigation),
          },
        ]
      : []),
    ...(festivalActive && content.hasAutographs
      ? [
          {
            key: 'autographs',
            icon: 'ticket' as const,
            label: 'Автографы',
            isActive: currentTabName === 'Autographs',
            onPress: () => openAutographsMain(tabNavigation),
          },
        ]
      : []),
    ...(festivalActive
      ? [
          {
            key: 'food-court',
            icon: 'restaurant' as const,
            label: 'Фудкорт',
            isActive: moreNestedRoute === 'FoodCourtMain' || moreNestedRoute === 'FoodCourtDetail',
            onPress: () => tabNavigation.navigate('MoreTab', { screen: 'FoodCourtMain' }),
          },
        ]
      : []),
    {
      key: 'help',
      icon: 'medical',
      label: 'Экстренная помощь',
      isActive: currentTabName === 'HelpTab',
      onPress: () => tabNavigation.navigate('HelpTab'),
    },
    {
      key: 'settings',
      icon: 'settings',
      label: 'Настройки',
      isActive: moreNestedRoute === 'Settings' || moreNestedRoute === 'Legal',
      onPress: () => tabNavigation.navigate('MoreTab', { screen: 'Settings' }),
    },
    {
      key: 'rules',
      icon: 'document-text',
      label: 'Правила и быт',
      isActive: moreNestedRoute === 'FestivalRules',
      onPress: () => tabNavigation.navigate('MoreTab', { screen: 'FestivalRules' }),
    },
    {
      key: 'about',
      icon: 'information-circle',
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
            HomeTab: 'home',
            MapTab: 'map',
            HelpTab: 'medical',
            ScheduleTab: 'calendar',
            Autographs: 'ticket',
            FavoritesTab: 'star',
            PlaylistTab: 'radio',
            HeadlinersTab: 'mic',
            MoreTab: 'reorder-three',
          };
          const resolvedIcon = tabIcons[routeName];
          const active = currentTabName === routeName;
          const iconColor = active ? colors.tabActive : colors.tabInactive;

          return (
            <SidebarItem
              key={route.key}
              icon={resolvedIcon}
              iconNode={
                routeName === 'PlaylistTab' ? (
                  <RadioTabIcon color={iconColor} size={22} />
                ) : undefined
              }
              label={label}
              active={active}
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
