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
};

export function MapLocationBanner({ status, outsideTerritory, onRequestPermission }: Props) {
  if (status === 'denied') {
    return (
      <View style={styles.banner}>
        <Text style={styles.text}>Разрешите доступ к геолокации, чтобы видеть «Вы здесь»</Text>
        <Pressable accessibilityRole="button" onPress={onRequestPermission} style={styles.btn}>
          <Text style={styles.btnText}>Разрешить</Text>
        </Pressable>
      </View>
    );
  }

  if (outsideTerritory) {
    return (
      <View style={[styles.banner, styles.info]}>
        <Text style={styles.text}>Вы вне площадки — карта фестиваля доступна, маршрут можно построить из вашего города</Text>
      </View>
    );
  }

  if (status === 'loading') {
    return (
      <View style={[styles.banner, styles.info]}>
        <Text style={styles.text}>Определяем местоположение…</Text>
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
  info: {
    backgroundColor: 'rgba(28,28,30,0.92)',
  },
  text: {
    ...typography.caption,
    color: colors.text,
  },
  btn: {
    minHeight: 36,
    justifyContent: 'center',
  },
  btnText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
});
