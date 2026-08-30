import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import * as Linking from 'expo-linking';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/PrimaryButton';
import { MotionPressable } from '../components/MotionPressable';
import { ScreenTitle } from '../components/ScreenTitle';
import { LEGAL_OPERATOR } from '../constants/legal';
import { useAppData } from '../context/DataContext';
import { useUserLocation } from '../hooks/useUserLocation';
import type { RootTabParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { formatDistance, haversineMeters } from '../utils/map/geo';
import { nearestPois, poiCoordinate } from '../utils/map/poiData';

type Navigation = BottomTabNavigationProp<RootTabParamList, 'HelpTab'>;
type Props = { navigation: Navigation };

const OFFLINE_INSTRUCTIONS = [
  {
    title: 'Если стало плохо',
    body: 'Не оставайтесь один. Обратитесь к сотруднику фестиваля или идите к медпункту. При угрозе жизни звоните 112.',
  },
  {
    title: 'Потерялся человек или ребёнок',
    body: 'Оставайтесь у заметного объекта, сообщите охране имя, приметы и последнее место встречи. Не публикуйте персональные данные в открытых чатах.',
  },
  {
    title: 'Потерянные вещи',
    body: 'Обратитесь к охране или организатору. Назовите место и примерное время потери, опишите вещь без раскрытия её уникальных признаков.',
  },
];

export function HelpScreen({ navigation }: Props) {
  const { data } = useAppData();
  const { location, status, requestPermission } = useUserLocation(false);
  const [coordinatesVisible, setCoordinatesVisible] = useState(false);
  const [openInstruction, setOpenInstruction] = useState<number | null>(0);
  const origin = location ?? data.festivalMap?.center;

  const nearestMedical = useMemo(
    () => origin ? nearestPois(data.mapPois, 'medical', origin, 1)[0] : undefined,
    [data.mapPois, origin],
  );
  const nearestSecurity = useMemo(
    () => origin ? nearestPois(data.mapPois, 'security', origin, 1)[0] : undefined,
    [data.mapPois, origin],
  );
  const landmark = useMemo(() => {
    if (!location) return null;
    const candidates = (data.mapPois?.features ?? []).filter((poi) =>
      ['stage', 'entrance', 'info', 'medical', 'security'].includes(poi.properties.category),
    );
    return [...candidates].sort(
      (a, b) =>
        haversineMeters(location, poiCoordinate(a)) -
        haversineMeters(location, poiCoordinate(b)),
    )[0] ?? null;
  }, [data.mapPois, location]);

  const coordinatesText = location
    ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
    : null;

  const openRoute = (poi: typeof nearestMedical) => {
    if (!poi) return;
    navigation.navigate('MapTab', { poiId: poi.properties.id, routeTo: true });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={styles.eyebrow}>РАБОТАЕТ БЕЗ ИНТЕРНЕТА</Text>
          <ScreenTitle style={styles.screenTitle}>Помощь на фестивале</ScreenTitle>
          <Text style={styles.lead}>
            Быстрые действия, маршруты к медпункту и охране, а также официальные
            контакты организатора {data.festival.name} {data.festival.year}.
          </Text>
        </View>

        <View style={styles.emergency}>
          <View style={styles.row}>
            <View style={[styles.icon, styles.iconEmergency]}>
              <Ionicons name="call" size={24} color={colors.text} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>Экстренная служба 112</Text>
              <Text style={styles.caption}>Только при угрозе жизни, здоровью или безопасности</Text>
            </View>
          </View>
          <PrimaryButton label="Позвонить 112" onPress={() => void Linking.openURL('tel:112')} />
        </View>

        <HelpCard
          icon="medkit"
          title="Медпункт"
          detail={nearestMedical ? nearestMedical.properties.name : 'Точка пока не указана на карте'}
          action={nearestMedical ? 'Маршрут до ближайшего' : undefined}
          onAction={() => openRoute(nearestMedical)}
        />
        <HelpCard
          icon="shield-checkmark"
          title="Охрана"
          detail={nearestSecurity ? nearestSecurity.properties.name : 'Обратитесь к ближайшему сотруднику фестиваля'}
          action={nearestSecurity ? 'Маршрут до ближайшей' : undefined}
          onAction={() => openRoute(nearestSecurity)}
        />

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.icon}>
              <Ionicons name="locate" size={22} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>Моё положение</Text>
              <Text style={styles.caption}>
                {coordinatesText
                  ? `${coordinatesText}${landmark ? ` · рядом: ${landmark.properties.name}` : ''}`
                  : status === 'denied'
                    ? 'Доступ к геопозиции запрещён'
                    : 'Покажем координаты крупно для сотрудника'}
              </Text>
            </View>
          </View>
          <View style={styles.twoActions}>
            <MotionPressable
              accessibilityRole="button"
              onPress={() => coordinatesText ? setCoordinatesVisible(true) : void requestPermission()}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>{coordinatesText ? 'Показать' : 'Определить'}</Text>
            </MotionPressable>
            <MotionPressable
              accessibilityRole="button"
              disabled={!coordinatesText}
              onPress={() => void Share.share({ message: `Мои координаты на фестивале «Улетай»: ${coordinatesText}` })}
              style={[styles.secondaryButton, !coordinatesText && styles.disabled]}
            >
              <Text style={styles.secondaryButtonText}>Отправить</Text>
            </MotionPressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Организатор и потерянные вещи</Text>
          <Text style={styles.caption}>
            {LEGAL_OPERATOR.name} · {LEGAL_OPERATOR.phoneLabels[0]} · {LEGAL_OPERATOR.email}
          </Text>
          <View style={styles.twoActions}>
            <MotionPressable accessibilityRole="button" onPress={() => void Linking.openURL(`tel:${LEGAL_OPERATOR.phones[0]}`)} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Позвонить</Text>
            </MotionPressable>
            <MotionPressable accessibilityRole="button" onPress={() => void Linking.openURL(`mailto:${LEGAL_OPERATOR.email}`)} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Написать</Text>
            </MotionPressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Офлайн-инструкции</Text>
          {OFFLINE_INSTRUCTIONS.map((item, index) => {
            const open = openInstruction === index;
            return (
              <MotionPressable
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                aria-expanded={open}
                key={item.title}
                onPress={() => setOpenInstruction(open ? null : index)}
                style={styles.instruction}
              >
                <View style={styles.instructionHeader}>
                  <Text style={styles.instructionTitle}>{item.title}</Text>
                  <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                </View>
                {open ? <Text style={styles.instructionBody}>{item.body}</Text> : null}
              </MotionPressable>
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={coordinatesVisible} transparent animationType="fade" onRequestClose={() => setCoordinatesVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.coordinatesCard}>
            <Ionicons name="location" size={34} color={colors.primary} />
            <Text style={styles.coordinatesLabel}>МОИ КООРДИНАТЫ</Text>
            <Text selectable style={styles.coordinates}>{coordinatesText}</Text>
            {location?.accuracy != null ? (
              <Text style={styles.caption}>Точность около {formatDistance(location.accuracy)}</Text>
            ) : null}
            <PrimaryButton label="Закрыть" onPress={() => setCoordinatesVisible(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function HelpCard({
  icon,
  title,
  detail,
  action,
  onAction,
}: {
  icon: 'medkit' | 'shield-checkmark';
  title: string;
  detail: string;
  action?: string;
  onAction: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.icon}><Ionicons name={icon} size={22} color={colors.primary} /></View>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.caption}>{detail}</Text>
        </View>
      </View>
      {action ? (
        <MotionPressable accessibilityRole="button" onPress={onAction} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{action}</Text>
        </MotionPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.screen, paddingBottom: spacing.xxxl, gap: spacing.md },
  eyebrow: { ...typography.caption, color: colors.primary, fontWeight: '800', letterSpacing: 1 },
  screenTitle: { ...typography.screenTitle, color: colors.text, marginTop: spacing.xs },
  lead: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  card: { padding: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  emergency: { padding: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.emergencySurface, borderWidth: 1, borderColor: colors.live, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: spacing.xs },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  iconEmergency: { backgroundColor: colors.live },
  cardTitle: { ...typography.sectionTitle, color: colors.text },
  caption: { ...typography.caption, color: colors.textSecondary },
  twoActions: { flexDirection: 'row', gap: spacing.sm },
  secondaryButton: { minHeight: 48, flex: 1, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  secondaryButtonText: { ...typography.button, color: colors.primary, textAlign: 'center' },
  disabled: { opacity: 0.4 },
  section: { gap: spacing.sm, marginTop: spacing.md },
  sectionTitle: { ...typography.sectionTitle, color: colors.text },
  instruction: { minHeight: 48, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.md, gap: spacing.sm },
  instructionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  instructionTitle: { ...typography.body, color: colors.text, fontWeight: '700' },
  instructionBody: { ...typography.body, color: colors.textSecondary },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlayStrong, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  coordinatesCard: { width: '100%', maxWidth: 460, backgroundColor: colors.surface, borderRadius: radius.xxl, padding: spacing.xl, alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.borderStrong },
  coordinatesLabel: { ...typography.caption, color: colors.textMuted, letterSpacing: 1 },
  coordinates: { ...typography.screenTitle, color: colors.text, textAlign: 'center', fontSize: 28 },
});
