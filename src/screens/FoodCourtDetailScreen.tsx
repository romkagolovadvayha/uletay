import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FoodCourtCard } from '../components/FoodCourtCard';
import { useAppData } from '../context/DataContext';
import { useFavorites } from '../hooks/useFavorites';
import { FoodCourtStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = NativeStackScreenProps<FoodCourtStackParamList, 'FoodCourtDetail'>;

export function FoodCourtDetailScreen({ navigation, route }: Props) {
  const { data } = useAppData();
  const { isFoodFavorite, toggleFoodFavorite } = useFavorites();

  const vendor = useMemo(
    () => data.foodcourt.find((item) => item.id === route.params.vendorId),
    [data.foodcourt, route.params.vendorId],
  );

  if (!vendor) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.empty}>Точка не найдена</Text>
      </SafeAreaView>
    );
  }

  const isFavorite = isFoodFavorite(vendor.id);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => toggleFoodFavorite(vendor.id)}
          hitSlop={12}
        >
          <Ionicons
            name={isFavorite ? 'star' : 'star-outline'}
            size={22}
            color={isFavorite ? colors.star : colors.text}
          />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FoodCourtCard vendor={vendor} large />

        <Text style={styles.name}>{vendor.name.toUpperCase()}</Text>
        <Text style={styles.description}>{vendor.description}</Text>
        <Text style={styles.price}>{vendor.priceFrom.replace('от ', '')}</Text>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={16} color={colors.text} />
          <Text style={styles.locationText}>{vendor.distance}</Text>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xxl,
  },
  name: {
    ...typography.screenTitle,
    color: colors.text,
    fontSize: 22,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  price: {
    ...typography.heroArtist,
    color: colors.primary,
    fontSize: 28,
    marginBottom: spacing.lg,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  locationText: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xxxl,
  },
});
