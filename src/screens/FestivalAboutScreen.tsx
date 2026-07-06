import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenTitle } from '../components/ScreenTitle';
import { useAppData } from '../context/DataContext';
import { MoreStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { screenTitleSpacing } from '../theme/layout';
import { spacing } from '../theme/spacing';
import { typography, appFont } from '../theme/typography';

type Props = NativeStackScreenProps<MoreStackParamList, 'FestivalAbout'>;

export function FestivalAboutScreen({ navigation }: Props) {
  const { data } = useAppData();

  const items = [
    { label: 'О фестивале', value: `${data.festival.name} ${data.festival.year}` },
    { label: 'Даты', value: '8–12 июля 2026' },
    { label: 'Локация', value: data.festival.locationShort },
    { label: 'Возраст', value: data.festival.ageRating },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backRow, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textSecondary} />
          <Text style={styles.backLabel}>Назад</Text>
        </Pressable>

        <ScreenTitle style={styles.title}>О ФЕСТИВАЛЕ</ScreenTitle>

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
    ...screenTitleSpacing,
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
    ...appFont('bold'),
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  cardValue: {
    ...appFont('semiBold'),
    color: colors.text,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.9,
  },
});
