import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FavoriteNotificationsCard } from '../components/FavoriteNotificationsCard';
import { ScreenTitle } from '../components/ScreenTitle';
import { useAppData } from '../context/DataContext';
import { AppTimeMode, useDemoMode } from '../context/DemoModeContext';
import { MoreStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { appFont, typography } from '../theme/typography';
import { describeDemoFestivalMoment } from '../utils/demoTime';

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

export function SettingsScreen({ navigation }: Props) {
  const { data } = useAppData();
  const { mode, ready, setMode } = useDemoMode();

  const handleModeChange = (nextMode: AppTimeMode) => {
    if (nextMode !== mode) {
      void setMode(nextMode);
    }
  };

  const demoDescription = describeDemoFestivalMoment(data.festival.startDate);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityRole="button"
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
    paddingBottom: spacing.xxl,
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
  pressed: {
    opacity: 0.9,
  },
});
