import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMoreMenu } from '../context/MoreMenuContext';
import { useFestivalActive } from '../hooks/useFestivalActive';
import { useIsTablet } from '../hooks/useIsTablet';
import { RootTabParamList } from '../navigation/types';
import { openHeadlinersMain } from '../navigation/scheduleNavigation';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { appFont, typography } from '../theme/typography';
import { ScreenTitle } from './ScreenTitle';

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
  const festivalActive = useFestivalActive();

  if (isTablet) {
    return null;
  }

  const menuItems: MenuItem[] = [
    ...(festivalActive
      ? [
          {
            icon: 'restaurant-outline' as const,
            label: 'Фудкорт',
            onPress: () => {
              close();
              navigation.navigate('MoreTab', { screen: 'FoodCourtMain' });
            },
          },
        ]
      : [
          {
            icon: 'mic-outline' as const,
            label: 'Хэдлайнеры',
            onPress: () => {
              close();
              openHeadlinersMain(navigation);
            },
          },
        ]),
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
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <View style={styles.overlay}>
        <Pressable accessibilityRole="button" style={styles.backdrop} onPress={close} />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
          ]}
        >
          <View style={styles.handle} />
          <ScreenTitle style={styles.title}>Ещё</ScreenTitle>
          {menuItems.map((item) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              onPress={item.onPress}
              style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
            >
              <Ionicons name={item.icon} size={22} color={colors.primary} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
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
  pressed: {
    opacity: 0.9,
  },
});
