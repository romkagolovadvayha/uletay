import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { mapColors } from '../../theme/map';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { LocationStatus } from '../../hooks/useUserLocation';

type Props = {
  status: LocationStatus;
  outsideTerritory?: boolean;
  onRequestPermission: () => void;
  embedded?: boolean;
};

export function MapLocationBanner({
  status,
  outsideTerritory,
  onRequestPermission,
  embedded = false,
}: Props) {
  const bannerStyle = [styles.banner, embedded && styles.bannerEmbedded];

  if (status === 'denied') {
    return (
      <View style={bannerStyle}>
        <Text style={styles.text}>
          Карта работает без геолокации. Чтобы показать вас на карте, разрешите доступ в настройках браузера или телефона.
        </Text>
        <Pressable accessibilityRole="button" onPress={onRequestPermission} style={styles.btn}>
          <Text style={styles.btnText}>Проверить снова</Text>
        </Pressable>
      </View>
    );
  }

  if (status === 'prompt') {
    return (
      <View style={bannerStyle}>
        <Text style={styles.text}>Покажем, где вы находитесь, и проложим путь до нужного места.</Text>
        <Pressable accessibilityRole="button" onPress={onRequestPermission} style={styles.btn}>
          <Text style={styles.btnText}>Показать моё место</Text>
        </Pressable>
      </View>
    );
  }

  if (outsideTerritory) {
    return (
      <View style={[...bannerStyle, styles.info]}>
        <Text style={styles.text}>Вы находитесь не на фестивале</Text>
      </View>
    );
  }

  if (status === 'loading') {
    return (
      <View style={[...bannerStyle, styles.info]}>
        <Text style={styles.text}>Проверяем доступ к геолокации…</Text>
      </View>
    );
  }

  if (status === 'unavailable') {
    return (
      <View style={[...bannerStyle, styles.info]}>
        <Text style={styles.text}>Геолокация недоступна — включите GPS в настройках телефона</Text>
        <Pressable accessibilityRole="button" onPress={onRequestPermission} style={styles.btn}>
          <Text style={styles.btnText}>Повторить</Text>
        </Pressable>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 52,
    left: spacing.screen,
    right: spacing.screen,
    zIndex: 15,
    backgroundColor: mapColors.sheetBg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  bannerEmbedded: {
    position: 'relative',
    top: 0,
    left: 0,
    right: 0,
  },
  info: {
    backgroundColor: 'rgba(28,28,30,0.92)',
  },
  text: {
    ...typography.caption,
    color: colors.text,
  },
  btn: {
    minHeight: 44,
    justifyContent: 'center',
  },
  btnText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
});
