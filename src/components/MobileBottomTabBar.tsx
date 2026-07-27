import { BottomTabBarHeightCallbackContext, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import React, { useContext, useMemo } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVisibleMainTabRoutes } from '../navigation/mainTabRoutes';
import { RootTabParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { resolveAndroidBottomInset } from '../utils/safeArea';
import { MotionPressable } from './MotionPressable';

/** Equal inner padding above/below tab items (safe-area added separately below). */
export const TAB_BAR_INNER_PADDING = 8;

const ICON_SLOT = 24;
/** Icon + gap + label — keeps native layout from collapsing under flex:1. */
const ITEM_CONTENT_HEIGHT = ICON_SLOT + 2 + 11;

/**
 * Phone bottom tab bar without React Navigation's empty absoluteFill
 * background wrapper, which leaves uneven top space on web/native.
 */
export function MobileBottomTabBar({
  state,
  descriptors,
  navigation,
  insets,
}: BottomTabBarProps) {
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);
  const safeInsets = useSafeAreaInsets();
  const bottomInset = resolveAndroidBottomInset(insets.bottom, safeInsets.bottom);
  const mainTabRoutes = useVisibleMainTabRoutes();
  const focusedOptions = descriptors[state.routes[state.index]?.key ?? '']?.options;
  const activeColor = focusedOptions?.tabBarActiveTintColor ?? colors.tabActive;
  const inactiveColor = focusedOptions?.tabBarInactiveTintColor ?? colors.tabInactive;

  const visibleRoutes = useMemo(
    () =>
      state.routes.filter((route) => {
        const name = route.name as keyof RootTabParamList;
        return name === 'MoreTab' || mainTabRoutes.includes(name);
      }),
    [mainTabRoutes, state.routes],
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    onHeightChange?.(event.nativeEvent.layout.height);
  };

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.bar,
        {
          paddingTop: TAB_BAR_INNER_PADDING,
          paddingBottom: TAB_BAR_INNER_PADDING + bottomInset,
        },
      ]}
    >
      <View accessibilityRole="tablist" style={styles.row}>
        {visibleRoutes.map((route) => {
          const index = state.routes.findIndex((item) => item.key === route.key);
          const focused = index === state.index;
          const { options } = descriptors[route.key];
          const color = focused ? activeColor : inactiveColor;
          const label =
            typeof options.title === 'string'
              ? options.title
              : typeof options.tabBarLabel === 'string'
                ? options.tabBarLabel
                : route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.dispatch({
                ...CommonActions.navigate(route.name, route.params),
                target: state.key,
              });
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const icon =
            options.tabBarIcon?.({
              focused,
              color,
              size: 22,
            }) ?? null;

          return (
            // Flex lives on View so web <button> defaults cannot stretch columns unevenly.
            <View key={route.key} style={styles.itemSlot}>
              <MotionPressable
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                testID={options.tabBarButtonTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.item}
                pressedScale={0.92}
              >
                <View style={styles.iconSlot}>
                  {focused ? <View style={styles.activeGlow} /> : null}
                  {icon}
                </View>
                <Text style={[styles.label, { color }]} numberOfLines={1} ellipsizeMode="clip">
                  {label}
                </Text>
              </MotionPressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.background,
    borderTopColor: colors.borderStrong,
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 0,
    shadowOpacity: 0,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: ITEM_CONTENT_HEIGHT,
  },
  itemSlot: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    height: '100%',
    justifyContent: 'center',
  },
  item: {
    // Avoid flex:1 here: on Android an unbounded flex child collapses the bar
    // height while icons/labels still paint, so the background looks too short
    // and the top inner padding disappears.
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 2,
    margin: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    width: '100%',
    height: '100%',
    minWidth: 0,
    maxWidth: '100%',
    ...Platform.select({
      web: {
        // Extra reset for native <button> UA styles on RN web.
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 2,
        paddingRight: 2,
      },
      default: {},
    }),
  },
  iconSlot: {
    width: ICON_SLOT,
    height: ICON_SLOT,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 12,
  },
  activeGlow: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(255, 207, 36, 0.14)',
  },
  label: {
    ...typography.tabLabel,
    fontSize: 9,
    lineHeight: 11,
    textAlign: 'center',
    maxWidth: '100%',
    includeFontPadding: false,
  },
});
