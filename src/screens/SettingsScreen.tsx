import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FavoriteNotificationsCard } from '../components/FavoriteNotificationsCard';
import { ScreenTitle } from '../components/ScreenTitle';
import { MotionPressable } from '../components/MotionPressable';
import { PRIVACY_POLICY_URL } from '../constants/legal';
import { AppTimeMode, useDemoMode } from '../context/DemoModeContext';
import { useAppData } from '../context/DataContext';
import { MoreStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { appFont, typography } from '../theme/typography';
import { clearOfflineAppCache } from '../utils/clearOfflineAppCache';

type Props = NativeStackScreenProps<MoreStackParamList, 'Settings'>;

type ModeOptionProps = {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
};

function ModeOption({ title, subtitle, selected, onPress }: ModeOptionProps) {
  return (
    <MotionPressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      style={[styles.modeOption, selected && styles.modeOptionSelected]}
    >
      <View style={styles.modeTextWrap}>
        <Text style={[styles.modeTitle, selected && styles.modeTitleSelected]}>{title}</Text>
        <Text style={styles.modeSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={22}
        color={selected ? colors.primary : colors.textMuted}
      />
    </MotionPressable>
  );
}

type SettingsLinkProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
};

function SettingsLink({ icon, title, subtitle, onPress }: SettingsLinkProps) {
  return (
    <MotionPressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.settingsLink}
    >
      <Ionicons name={icon} size={22} color={colors.primary} />
      <View style={styles.modeTextWrap}>
        <Text style={styles.modeTitle}>{title}</Text>
        <Text style={styles.modeSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </MotionPressable>
  );
}

export function SettingsScreen({ navigation }: Props) {
  const { mode, ready, setMode, demoDescription } = useDemoMode();
  const { refreshData } = useAppData();
  const [clearingCache, setClearingCache] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);

  const handleModeChange = (nextMode: AppTimeMode) => {
    if (nextMode !== mode) {
      void setMode(nextMode);
    }
  };

  const runClearCache = async () => {
    if (clearingCache) {
      return;
    }
    setClearingCache(true);
    setConfirmReset(false);
    setCacheMessage(null);
    try {
      await clearOfflineAppCache({ reload: Platform.OS === 'web' });
      if (Platform.OS !== 'web') {
        await refreshData(true);
        Alert.alert('Готово', 'Кэш расписания очищен, данные загружены заново.');
      }
    } catch {
      const message = 'Не удалось очистить кэш. Попробуйте ещё раз.';
      if (Platform.OS === 'web') setCacheMessage(message);
      else Alert.alert('Ошибка', message);
    } finally {
      setClearingCache(false);
    }
  };

  const handleClearCachePress = () => {
    if (Platform.OS === 'web') {
      setConfirmReset(true);
      return;
    }
    Alert.alert(
      'Сбросить кэш?',
      'Будет очищен офлайн-кэш расписания и данные загрузятся с сервера заново. Избранное и настройки уведомлений сохранятся.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Сбросить кэш',
          style: 'destructive',
          onPress: () => {
            void runClearCache();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel="Назад"
          onPress={() => navigation.goBack()}
          style={styles.backRow}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textSecondary} />
          <Text style={styles.backLabel}>Назад</Text>
        </MotionPressable>

        <ScreenTitle style={styles.title}>НАСТРОЙКИ</ScreenTitle>

        <Text style={styles.sectionLabel}>Режим времени</Text>
        <View style={styles.section}>
          <ModeOption
            title="Реальный"
            subtitle="Текущие дата и время устройства"
            selected={ready && mode === 'real'}
            onPress={() => handleModeChange('real')}
          />
          <ModeOption
            title="Демо"
            subtitle={`Как во время фестиваля: ${demoDescription}`}
            selected={ready && mode === 'demo'}
            onPress={() => handleModeChange('demo')}
          />
        </View>

        <Text style={styles.sectionLabel}>Оповещения</Text>
        <FavoriteNotificationsCard />

        <Text style={styles.sectionLabel}>Данные</Text>
        <View style={styles.section}>
          <SettingsLink
            icon="refresh"
            title={clearingCache ? 'Сброс…' : 'Сбросить кэш'}
            subtitle="Если расписание или артисты не подгружаются — сбросит офлайн-кэш"
            onPress={clearingCache ? () => undefined : handleClearCachePress}
          />
        </View>

        {cacheMessage ? <Text accessibilityRole="alert" style={styles.modeSubtitle}>{cacheMessage}</Text> : null}
        <Text style={styles.sectionLabel}>Правовая информация</Text>
        <View style={styles.section}>
          <SettingsLink
            icon="shield-checkmark"
            title="Конфиденциальность и поддержка"
            subtitle="Политика, соглашение, контакты организатора"
            onPress={() => navigation.navigate('Legal')}
          />
          <SettingsLink
            icon="document-text"
            title="Правила фестиваля"
            subtitle="Правила посещения, безопасность и бытовая информация"
            onPress={() => navigation.navigate('FestivalRules')}
          />
          <Text style={styles.legalNote}>
            Политика конфиденциальности также доступна по адресу {PRIVACY_POLICY_URL}
          </Text>
        </View>
      </ScrollView>
      <Modal visible={confirmReset} transparent animationType="fade" onRequestClose={() => setConfirmReset(false)}>
        <View style={styles.dialogBackdrop}>
          <View style={styles.dialog} accessibilityViewIsModal>
            <Text accessibilityRole="header" style={styles.modeTitle}>Сбросить кэш?</Text>
            <Text style={styles.modeSubtitle}>
              Данные загрузятся заново, страница перезагрузится. Избранное и настройки уведомлений сохранятся.
            </Text>
            <View style={styles.dialogActions}>
              <Pressable accessibilityRole="button" onPress={() => setConfirmReset(false)} style={styles.dialogButton}>
                <Text style={styles.modeTitle}>Отмена</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => void runClearCache()} style={styles.dialogButton}>
                <Text style={[styles.modeTitle, { color: colors.primary }]}>Сбросить кэш</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  dialogBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 24, gap: 16, maxWidth: 460, width: '100%', alignSelf: 'center' },
  dialogActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 12 },
  dialogButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 },
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.headerTop,
    paddingBottom: spacing.xxl,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
    minHeight: 48,
  },
  backLabel: {
    ...appFont('semiBold'),
    color: colors.textSecondary,
    fontSize: 15,
  },
  title: {
    ...typography.screenTitle,
    color: colors.text,
    fontSize: 22,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.sectionTitle,
    color: colors.textSecondary,
    fontSize: 12,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  section: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  modeOption: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  modeOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  modeTextWrap: {
    flex: 1,
    gap: 4,
  },
  modeTitle: {
    ...typography.body,
    ...appFont('semiBold'),
    color: colors.text,
    fontSize: 16,
  },
  modeTitleSelected: {
    color: colors.primary,
  },
  modeSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  settingsLink: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  legalNote: {
    ...typography.body,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: spacing.xs,
  },
});
