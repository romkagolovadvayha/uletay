import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { UserMapMarker, UserMapMarkerKind } from '../../types/map';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatDistance, haversineMeters } from '../../utils/map/geo';
import { MotionPressable } from '../MotionPressable';

type Props = {
  markers: UserMapMarker[];
  userLocation?: { lat: number; lng: number } | null;
  onSaveHere: (kind: UserMapMarkerKind) => void;
  onPlaceOnMap: (kind: UserMapMarkerKind) => void;
  onRoute: (marker: UserMapMarker) => void;
  onRemove: (kind: UserMapMarkerKind) => void;
  onClose: () => void;
};

const META: Record<UserMapMarkerKind, { title: string; icon: 'car' | 'leaf' }> = {
  car: { title: 'машину', icon: 'car' },
  tent: { title: 'палатку', icon: 'leaf' },
};

export function MapSavedPlacesPanel({
  markers,
  userLocation,
  onSaveHere,
  onPlaceOnMap,
  onRoute,
  onRemove,
  onClose,
}: Props) {
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Мои места</Text>
          <Text style={styles.subtitle}>Хранятся только на этом устройстве</Text>
        </View>
        <MotionPressable accessibilityRole="button" accessibilityLabel="Закрыть" onPress={onClose} style={styles.close}>
          <Ionicons name="close" size={22} color={colors.text} />
        </MotionPressable>
      </View>

      {(['car', 'tent'] as const).map((kind) => {
        const marker = markers.find((item) => item.kind === kind);
        const meta = META[kind];
        const distance = marker && userLocation
          ? haversineMeters(userLocation, marker.coordinate)
          : null;
        return (
          <View key={kind} style={styles.place}>
            <View style={styles.placeTitleRow}>
              <View style={styles.icon}>
                <Ionicons name={meta.icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.placeText}>
                <Text style={styles.placeTitle}>{marker ? (kind === 'car' ? 'Моя машина' : 'Моя палатка') : `Запомнить ${meta.title}`}</Text>
                <Text style={styles.placeCaption}>
                  {marker
                    ? distance == null
                      ? `Сохранено ${new Date(marker.savedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
                      : `${formatDistance(distance)} · около ${Math.max(1, Math.round(distance / 80))} мин`
                    : 'Сохраните текущее место или укажите точку на карте'}
                </Text>
              </View>
            </View>
            <View style={styles.actions}>
              {marker ? (
                <>
                  <MotionPressable accessibilityRole="button" onPress={() => onRoute(marker)} style={[styles.action, styles.actionPrimary]}>
                    <Ionicons name="navigate" size={16} color={colors.primaryText} />
                    <Text style={styles.actionPrimaryText}>Маршрут</Text>
                  </MotionPressable>
                  <MotionPressable accessibilityRole="button" onPress={() => onRemove(kind)} style={styles.action}>
                    <Text style={styles.actionText}>Удалить</Text>
                  </MotionPressable>
                </>
              ) : (
                <>
                  <MotionPressable accessibilityRole="button" disabled={!userLocation} onPress={() => onSaveHere(kind)} style={[styles.action, !userLocation && styles.disabled]}>
                    <Text style={styles.actionText}>Я здесь</Text>
                  </MotionPressable>
                  <MotionPressable accessibilityRole="button" onPress={() => onPlaceOnMap(kind)} style={styles.action}>
                    <Text style={styles.actionText}>На карте</Text>
                  </MotionPressable>
                </>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { ...typography.sectionTitle, color: colors.text },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: -spacing.sm },
  place: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, backgroundColor: colors.surfaceElevated },
  placeTitleRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  placeText: { flex: 1, gap: 2 },
  placeTitle: { ...typography.body, color: colors.text, fontWeight: '700' },
  placeCaption: { ...typography.caption, color: colors.textSecondary },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { minHeight: 44, flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.xs },
  actionPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionText: { ...typography.button, color: colors.text },
  actionPrimaryText: { ...typography.button, color: colors.primaryText },
  disabled: { opacity: 0.45 },
});
