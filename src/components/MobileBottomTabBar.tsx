import { BottomTabBarHeightCallbackContext, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import React, { useContext } from 'react';
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

/** Equal inner padding above/below tab items (safe-area added separately below). */
export const TAB_BAR_INNER_PADDING = 8;

const ICON_SLOT = 24;

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
  const bottomInset = Math.max(insets.bottom, 0);
  const focusedOptions = descriptors[state.routes[state.index]?.key ?? '']?.options;
  const activeColor = focusedOptions?.tabBarActiveTintColor ?? colors.tabActive;
  const inactiveColor = focusedOptions?.tabBarInactiveTintColor ?? colors.tabInactive;

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
        {state.routes.map((route, index) => {
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
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                testID={options.tabBarButtonTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                style={({ pressed }) => [styles.item, pressed && styles.pressed]}
              >
                <View style={styles.iconSlot}>{icon}</View>
                <Text style={[styles.label, { color }]} numberOfLines={1} ellipsizeMode="clip">
                  {label}
                </Text>
              </Pressable>
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
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
  },
  itemSlot: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 2,
    margin: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    width: '100%',
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
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    ...typography.tabLabel,
    fontSize: 9,
    lineHeight: 11,
    textAlign: 'center',
    maxWidth: '100%',
  },
});
