import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { getDefaultSidebarWidth } from '@react-navigation/elements';
import { NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppData } from '../context/DataContext';
import { useFestivalActive } from '../hooks/useFestivalActive';
import { useIsDesktopWeb } from '../hooks/useIsDesktopWeb';
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
import { webKeyboardActivationProps } from '../utils/webKeyboardActivation';
import { parseDateTime } from '../utils/scheduleHelpers';
import { CountdownTimer } from './CountdownTimer';
import { DeferredIonicons } from './DeferredIonicons';
import { RadioTabIcon } from './RadioTabIcon';

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
  desktop: boolean;
  onPress: () => void;
};

function SidebarItem({ icon, iconNode, label, active, desktop, onPress }: SidebarItemProps) {
  const [hovered, setHovered] = React.useState(false);
  const color = active ? colors.tabActive : desktop ? '#AEB3A8' : colors.tabInactive;

  return (
    <Pressable
      {...webKeyboardActivationProps(onPress)}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      aria-selected={active}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.item,
        desktop && styles.itemDesktop,
        active && styles.itemActive,
        desktop && active && styles.itemActiveDesktop,
        desktop && hovered && !active && styles.itemHoveredDesktop,
        pressed && styles.itemPressed,
      ]}
    >
      <View style={[styles.iconBox, desktop && styles.iconBoxDesktop, active && styles.iconBoxActive]}>
        {iconNode ?? (
          <DeferredIonicons
            name={icon ?? 'ellipse'}
            size={desktop ? 19 : 22}
            color={color}
          />
        )}
      </View>
      <Text
        style={[
          styles.itemLabel,
          desktop && styles.itemLabelDesktop,
          active && styles.itemLabelActive,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {desktop && active ? <View style={styles.itemActiveDot} /> : null}
    </Pressable>
  );
}

export function TabletSidebar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = useIsDesktopWeb();
  const { data } = useAppData();
  const festivalActive = useFestivalActive();
  const mainTabRoutes = useVisibleMainTabRoutes();
  const headlinersInMore = useHeadlinersInMoreTab();
  const content = useMainTabContentFlags();
  const tabNavigation = navigation as unknown as NavigationProp<RootTabParamList>;

  const sidebarWidth = isDesktop ? 274 : getDefaultSidebarWidth({ width });
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
      ? [{
          key: 'headliners',
          icon: 'mic' as const,
          label: 'Хэдлайнеры',
          isActive: moreNestedRoute === 'HeadlinersMain' || moreNestedRoute === 'HeadlinerDetail',
          onPress: () => openHeadlinersMain(tabNavigation),
        }]
      : []),
    ...(festivalActive && content.hasAutographs
      ? [{
          key: 'autographs',
          icon: 'ticket' as const,
          label: 'Автографы',
          isActive: currentTabName === 'Autographs',
          onPress: () => openAutographsMain(tabNavigation),
        }]
      : []),
    ...(festivalActive
      ? [{
          key: 'food-court',
          icon: 'restaurant' as const,
          label: 'Фудкорт',
          isActive: moreNestedRoute === 'FoodCourtMain' || moreNestedRoute === 'FoodCourtDetail',
          onPress: () => tabNavigation.navigate('MoreTab', { screen: 'FoodCourtMain' }),
        }]
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

  const tabIcons: Record<keyof RootTabParamList, keyof typeof Ionicons.glyphMap> = {
    HomeTab: 'home',
    MapTab: 'map',
    HelpTab: 'medical',
    ScheduleTab: 'calendar',
    Autographs: 'ticket',
    FavoritesTab: 'heart',
    PlaylistTab: 'radio',
    HeadlinersTab: 'mic',
    MoreTab: 'reorder-three',
  };
  const festivalStart = useMemo(
    () => parseDateTime(data.festival.startDate, '12:00'),
    [data.festival.startDate],
  );

  return (
    <View
      style={[
        styles.sidebar,
        isDesktop && styles.sidebarDesktop,
        {
          width: sidebarWidth,
          paddingTop: insets.top + (isDesktop ? 27 : spacing.lg),
          paddingBottom: insets.bottom + (isDesktop ? 20 : spacing.lg),
          paddingLeft: insets.left + (isDesktop ? 20 : spacing.lg),
          paddingRight: isDesktop ? 20 : spacing.lg,
        },
      ]}
    >
      {!isDesktop ? (
        <View style={styles.brand}>
          <View style={styles.brandRow}>
            <Text style={styles.brandTitle}>УЛЕТАЙ</Text>
          </View>
          <Text style={styles.brandSubtitle}>Фестиваль</Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isDesktop ? <Text style={styles.sectionLabel}>НАВИГАЦИЯ</Text> : null}
        <View style={styles.section}>
          {mainItems.map((route) => {
            const { options } = descriptors[route.key];
            const routeName = route.name as keyof RootTabParamList;
            const label = typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : (options.title ?? route.name);
            const active = currentTabName === routeName;
            const iconColor = active ? colors.tabActive : isDesktop ? '#AEB3A8' : colors.tabInactive;

            return (
              <SidebarItem
                key={route.key}
                icon={tabIcons[routeName]}
                iconNode={routeName === 'PlaylistTab'
                  ? <RadioTabIcon color={iconColor} size={isDesktop ? 19 : 22} />
                  : undefined}
                label={label}
                active={active}
                desktop={isDesktop}
                onPress={() => handleMainTabPress(routeName)}
              />
            );
          })}
        </View>

        <View style={[styles.divider, isDesktop && styles.dividerDesktop]} />
        {isDesktop ? <Text style={styles.sectionLabel}>ФЕСТИВАЛЬ</Text> : null}
        <View style={styles.section}>
          {extraItems.map((item) => (
            <SidebarItem
              key={item.key}
              icon={item.icon}
              label={item.label}
              active={item.isActive}
              desktop={isDesktop}
              onPress={item.onPress}
            />
          ))}
        </View>
      </ScrollView>

      {isDesktop ? (
        <View style={styles.sidebarCountdown}>
          <CountdownTimer
            targetDate={festivalStart}
            festivalStartDate={data.festival.startDate}
            festivalEndDate={data.festival.endDate}
            performances={data.schedule}
            compact
          />
        </View>
      ) : null}

      {isDesktop ? (
        <View style={styles.sidebarFooter}>
          <Text style={styles.sidebarFooterText}>МУЗЫКА · ЛЮДИ · СВОБОДА</Text>
          <Text style={styles.sidebarFooterIndex}>18+</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { backgroundColor: colors.background, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.borderStrong },
  sidebarDesktop: { backgroundColor: '#0F110F', borderRightColor: '#2B2E28', boxShadow: '18px 0 60px rgba(0,0,0,0.28)' } as ViewStyle,
  brand: { marginBottom: spacing.xxl, paddingHorizontal: spacing.sm },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandTitle: { ...typography.logoMain, color: colors.primary, fontSize: 28, lineHeight: 32 },
  brandSubtitle: { ...typography.logoTagline, color: colors.textSecondary, marginTop: spacing.xs },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 18 },
  sectionLabel: { ...appFont('semiBold'), color: '#686D64', fontSize: 8, letterSpacing: 1.6, marginLeft: 9, marginBottom: 9 },
  section: { gap: spacing.xs },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong, marginVertical: spacing.lg, marginHorizontal: spacing.sm },
  dividerDesktop: { backgroundColor: '#2A2D27', marginVertical: 18, marginHorizontal: 7 },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.lg },
  itemDesktop: { minHeight: 46, paddingVertical: 7, paddingHorizontal: 8, borderRadius: 11, gap: 10 },
  itemActive: { backgroundColor: colors.surfaceMuted },
  itemActiveDesktop: { backgroundColor: 'rgba(255,193,7,0.09)' },
  itemHoveredDesktop: { backgroundColor: '#181B17' },
  itemPressed: { opacity: 0.82 },
  iconBox: { alignItems: 'center', justifyContent: 'center' },
  iconBoxDesktop: { width: 30, height: 30, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.025)' },
  iconBoxActive: { backgroundColor: 'rgba(255,193,7,0.08)' },
  itemLabel: { ...typography.body, ...appFont('medium'), color: colors.tabInactive, fontSize: 15, flex: 1 },
  itemLabelDesktop: { color: '#AEB3A8', fontSize: 12, letterSpacing: 0.1 },
  itemLabelActive: { ...appFont('bold'), color: colors.text },
  itemActiveDot: { width: 5, height: 5, borderRadius: 3, marginRight: 3, backgroundColor: colors.primary, boxShadow: `0 0 9px ${colors.primary}` },
  sidebarCountdown: {
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 3,
    borderTopWidth: 1,
    borderTopColor: '#2A2D27',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2D27',
  },
  sidebarFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 17, paddingHorizontal: 7 },
  sidebarFooterText: { ...appFont('semiBold'), color: '#5E635A', fontSize: 6.5, letterSpacing: 1.1, flex: 1 },
  sidebarFooterIndex: { ...appFont('bold'), color: '#73786E', fontSize: 8 },
});
