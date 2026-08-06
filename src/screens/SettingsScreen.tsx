import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FavoriteNotificationsCard } from '../components/FavoriteNotificationsCard';
import { ScreenTitle } from '../components/ScreenTitle';
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
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.modeOption, selected && styles.modeOptionSelected, pressed && styles.pressed]}
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
    </Pressable>
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
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.settingsLink, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={22} color={colors.primary} />
      <View style={styles.modeTextWrap}>
        <Text style={styles.modeTitle}>{title}</Text>
        <Text style={styles.modeSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

export function SettingsScreen({ navigation }: Props) {
  const { mode, ready, setMode, demoDescription } = useDemoMode();
  const { refreshData } = useAppData();
  const [clearingCache, setClearingCache] = useState(false);

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
    try {
      await clearOfflineAppCache({ reload: Platform.OS === 'web' });
      if (Platform.OS !== 'web') {
        await refreshData(true);
        Alert.alert('Готово', 'Кэш расписания очищен, данные загружены заново.');
      }
    } catch {
      Alert.alert('Не удалось очистить кэш', 'Попробуйте ещё раз или очистите данные сайта в настройках браузера.');
    } finally {
      if (Platform.OS !== 'web') {
        setClearingCache(false);
      }
    }
  };

  const handleClearCachePress = () => {
    Alert.alert(
      'Сбросить кэш?',
      Platform.OS === 'web'
        ? 'Будет очищен офлайн-кэш и service worker. Страница перезагрузится. Избранное и настройки уведомлений сохранятся.'
        : 'Будет очищен офлайн-кэш расписания и данные загрузятся с сервера заново. Избранное и настройки уведомлений сохранятся.',
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Назад"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backRow, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textSecondary} />
          <Text style={styles.backLabel}>Назад</Text>
        </Pressable>

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
            icon="refresh-outline"
            title={clearingCache ? 'Сброс…' : 'Сбросить кэш'}
            subtitle="Если расписание или артисты не подгружаются — сбросит офлайн-кэш"
            onPress={clearingCache ? () => undefined : handleClearCachePress}
          />
        </View>

        <Text style={styles.sectionLabel}>Правовая информация</Text>
        <View style={styles.section}>
          <SettingsLink
            icon="shield-checkmark-outline"
            title="Конфиденциальность и поддержка"
            subtitle="Политика, соглашение, контакты организатора"
            onPress={() => navigation.navigate('Legal')}
          />
          <SettingsLink
            icon="document-text-outline"
            title="Правила фестиваля"
            subtitle="Правила посещения, безопасность и бытовая информация"
            onPress={() => navigation.navigate('FestivalRules')}
          />
          <Text style={styles.legalNote}>
            Политика конфиденциальности также доступна по адресу {PRIVACY_POLICY_URL}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  pressed: {
    opacity: 0.9,
  },
});
