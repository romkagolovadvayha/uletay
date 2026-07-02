import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppData } from '../context/DataContext';
import { MoreStackParamList, RootTabParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { screenTitleSpacing } from '../theme/layout';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = NativeStackScreenProps<MoreStackParamList, 'MoreHome'>;

export function MoreScreen({ navigation }: Props) {
  const { data } = useAppData();
  const tabNavigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();

  const items = [
    { label: 'О фестивале', value: `${data.festival.name} ${data.festival.year}` },
    { label: 'Даты', value: '8–12 июля 2026' },
    { label: 'Локация', value: data.festival.locationShort },
    { label: 'Данные', value: 'Загружаются с сервера, кэш 1 мин' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>ЕЩЁ</Text>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
          onPress={() => tabNavigation.navigate('FavoritesTab')}
        >
          <Ionicons name="star-outline" size={20} color={colors.primary} />
          <Text style={styles.menuLabel}>Моё расписание</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        {items.map((item) => (
          <View key={item.label} style={styles.card}>
            <Text style={styles.cardLabel}>{item.label}</Text>
            <Text style={styles.cardValue}>{item.value}</Text>
          </View>
        ))}

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
  title: {
    ...typography.screenTitle,
    color: colors.text,
    ...screenTitleSpacing,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuLabel: {
    ...typography.body,
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  cardValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.9,
  },
});
