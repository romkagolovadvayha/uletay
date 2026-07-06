import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FoodCourtCard } from '../components/FoodCourtCard';
import { useAppData } from '../context/DataContext';
import { useFavorites } from '../hooks/useFavorites';
import { MoreStackParamList, RootTabParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = NativeStackScreenProps<MoreStackParamList, 'FoodCourtDetail'>;
type MapNavigation = CompositeNavigationProp<
  NativeStackScreenProps<MoreStackParamList, 'FoodCourtDetail'>['navigation'],
  BottomTabNavigationProp<RootTabParamList>
>;

export function FoodCourtDetailScreen({ navigation, route }: Props) {
  const { data } = useAppData();
  const { isFoodFavorite, toggleFoodFavorite } = useFavorites();
  const tabNavigation = navigation.getParent<MapNavigation>();

  const vendor = useMemo(
    () => data.foodcourt.find((item) => item.id === route.params.vendorId),
    [data.foodcourt, route.params.vendorId],
  );

  const mapPoiId = useMemo(() => {
    if (!vendor) return undefined;
    const poi = data.mapPois?.features.find(
      (f) => f.properties.link?.type === 'foodcourt' && f.properties.link.id === vendor.id,
    );
    return poi?.properties.id;
  }, [data.mapPois, vendor]);

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

        {mapPoiId && tabNavigation ? (
          <Pressable
            accessibilityRole="button"
            style={styles.mapButton}
            onPress={() => tabNavigation.navigate('MapTab', { poiId: mapPoiId })}
          >
            <Ionicons name="map-outline" size={18} color={colors.background} />
            <Text style={styles.mapButtonText}>На карте</Text>
          </Pressable>
        ) : null}
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
  mapButton: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  mapButtonText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xxxl,
  },
});
