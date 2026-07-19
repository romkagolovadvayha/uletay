import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  BackHandler,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMoreMenu } from '../context/MoreMenuContext';
import { useAppData } from '../context/DataContext';
import { useFestivalActive } from '../hooks/useFestivalActive';
import { useIsTablet } from '../hooks/useIsTablet';
import { RootTabParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { appFont, typography } from '../theme/typography';
import { resolveAndroidBottomInset } from '../utils/safeArea';
import { DeferredIonicons } from './DeferredIonicons';
import { ScreenTitle } from './ScreenTitle';
import { MotionPressable } from './MotionPressable';

type MoreNavigation = BottomTabNavigationProp<RootTabParamList>;

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

export function MoreMenuSheet() {
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const navigation = useNavigation<MoreNavigation>();
  const { visible, close } = useMoreMenu();
  const { data } = useAppData();
  const festivalActive = useFestivalActive();
  const bottomInset = resolveAndroidBottomInset(insets.bottom);
  const [entrance] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!visible) {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });

    return () => subscription.remove();
  }, [visible, close]);

  useEffect(() => {
    if (!visible) return;
    entrance.setValue(0);
    Animated.spring(entrance, {
      toValue: 1,
      damping: 22,
      stiffness: 220,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [entrance, visible]);

  if (isTablet || !visible) {
    return null;
  }

  const menuItems: MenuItem[] = [
    ...(festivalActive && data.festival.startDate && data.festival.endDate
      ? [{
          icon: 'restaurant-outline' as const,
          label: 'Еда и напитки',
          onPress: () => {
            close();
            navigation.navigate('MoreTab', { screen: 'FoodCourtMain' });
          },
        }]
      : []),
    {
      icon: 'settings-outline',
      label: 'Настройки',
      onPress: () => {
        close();
        navigation.navigate('MoreTab', { screen: 'Settings' });
      },
    },
    {
      icon: 'document-text-outline',
      label: 'Правила и быт',
      onPress: () => {
        close();
        navigation.navigate('MoreTab', { screen: 'FestivalRules' });
      },
    },
    {
      icon: 'information-circle-outline',
      label: 'О фестивале',
      onPress: () => {
        close();
        navigation.navigate('MoreTab', { screen: 'FestivalAbout' });
      },
    },
    {
      icon: 'help-circle-outline',
      label: 'Контакты и помощь',
      onPress: () => {
        close();
        navigation.navigate('MoreTab', { screen: 'Legal' });
      },
    },
  ];

  return (
    <Animated.View
      style={[styles.overlay, { opacity: entrance }]}
      accessibilityViewIsModal
      importantForAccessibility="yes"
    >
      <Pressable accessibilityRole="button" style={styles.backdrop} onPress={close} />
      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: Math.max(bottomInset, spacing.lg) },
          { transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }] },
        ]}
      >
        <View style={styles.handle} />
        <ScreenTitle style={styles.title}>Ещё</ScreenTitle>
        {menuItems.map((item) => (
          <MotionPressable
            key={item.label}
            accessibilityRole="button"
            onPress={item.onPress}
            style={styles.menuRow}
          >
            <DeferredIonicons name={item.icon} size={22} color={colors.primary} />
            <Text style={styles.menuLabel}>{item.label}</Text>
            <DeferredIonicons name="chevron-forward" size={18} color={colors.textMuted} />
          </MotionPressable>
        ))}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    zIndex: 200,
    elevation: 200,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlayStrong,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.screenTitle,
    color: colors.text,
    fontSize: 22,
    marginBottom: spacing.md,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  menuLabel: {
    ...typography.body,
    ...appFont('semiBold'),
    color: colors.text,
    fontSize: 16,
    flex: 1,
  },
});
