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
import { useIsTablet } from '../hooks/useIsTablet';
import { RootTabParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { appFont, typography } from '../theme/typography';
import { FavoriteNotificationsCard } from './FavoriteNotificationsCard';

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
  const { visible, panel, close, showNotifications, showMenu } = useMoreMenu();

  if (isTablet && panel === 'menu') {
    return null;
  }

  const menuItems: MenuItem[] = [
    {
      icon: 'restaurant-outline',
      label: 'Фудкорт',
      onPress: () => {
        close();
        navigation.navigate('MoreTab', { screen: 'FoodCourtMain' });
      },
    },
    {
      icon: 'notifications-outline',
      label: 'Оповещения',
      onPress: showNotifications,
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
      <View style={[styles.overlay, isTablet && styles.overlayTablet]}>
        <Pressable accessibilityRole="button" style={styles.backdrop} onPress={close} />
        <View
          style={[
            styles.sheet,
            isTablet && styles.sheetTablet,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
          ]}
        >
          {panel === 'menu' ? (
            <>
              <View style={styles.handle} />
              <Text style={styles.title}>Ещё</Text>
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
            </>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={showMenu}
                style={({ pressed }) => [styles.backRow, pressed && styles.pressed]}
              >
                <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
                <Text style={styles.backLabel}>Назад</Text>
              </Pressable>
              <Text style={styles.title}>Оповещения</Text>
              <FavoriteNotificationsCard />
            </>
          )}
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
  overlayTablet: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
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
  sheetTablet: {
    width: '100%',
    maxWidth: 480,
    borderRadius: radius.xxl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderWidth: StyleSheet.hairlineWidth,
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
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  backLabel: {
    ...appFont('semiBold'),
    color: colors.textSecondary,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.9,
  },
});
