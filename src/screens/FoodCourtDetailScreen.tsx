import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FoodCourtCard } from '../components/FoodCourtCard';
import { MotionPressable } from '../components/MotionPressable';
import { ScreenTitle } from '../components/ScreenTitle';
import { useAppData } from '../context/DataContext';
import { useFavorites } from '../hooks/useFavorites';
import { MoreStackParamList, RootTabParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = NativeStackScreenProps<MoreStackParamList, 'FoodCourtDetail'>;

export function FoodCourtDetailScreen({ navigation, route }: Props) {
  const { data } = useAppData();
  const { isFoodFavorite, toggleFoodFavorite } = useFavorites();

  const vendor = useMemo(
    () => data.foodcourt.find((item) => item.id === route.params.vendorId),
    [data.foodcourt, route.params.vendorId],
  );
  const mapPoi = useMemo(
    () =>
      data.mapPois?.features.find(
        (poi) => poi.properties.link?.type === 'foodcourt' && poi.properties.link.id === route.params.vendorId,
      ) ?? data.mapPois?.features.find((poi) => poi.properties.category === 'foodcourt'),
    [data.mapPois, route.params.vendorId],
  );

  if (!vendor) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenTitle style={styles.empty}>Точка не найдена</ScreenTitle>
      </SafeAreaView>
    );
  }

  const isFavorite = isFoodFavorite(vendor.id);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel="Назад"
          accessibilityHint="Вернуться к списку фудкорта"
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.iconButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </MotionPressable>
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel={
            isFavorite ? 'Убрать точку из избранного' : 'Добавить точку в избранное'
          }
          accessibilityState={{ selected: isFavorite }}
          aria-pressed={isFavorite}
          onPress={() => toggleFoodFavorite(vendor.id)}
          hitSlop={12}
          style={styles.iconButton}
        >
          <Ionicons
            name={isFavorite ? 'star' : 'star-outline'}
            size={22}
            color={isFavorite ? colors.star : colors.text}
          />
        </MotionPressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FoodCourtCard vendor={vendor} large />

        <ScreenTitle style={styles.name}>{vendor.name.toUpperCase()}</ScreenTitle>
        <Text style={styles.description}>{vendor.description}</Text>
        <Text style={styles.price}>{vendor.priceFrom.replace('от ', '')}</Text>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={16} color={colors.text} />
          <Text style={styles.locationText}>{vendor.location}</Text>
        </View>
        {mapPoi ? (
          <MotionPressable
            accessibilityRole="button"
            onPress={() => {
              const tabs = navigation.getParent() as BottomTabNavigationProp<RootTabParamList> | undefined;
              tabs?.navigate('MapTab', { poiId: mapPoi.properties.id });
            }}
            style={styles.mapButton}
          >
            <Ionicons name="map-outline" size={19} color={colors.primaryText} />
            <Text style={styles.mapButtonText}>Показать на карте</Text>
          </MotionPressable>
        ) : null}

        {vendor.legalName ? (
          <Text style={styles.metaLine}>{vendor.legalName}</Text>
        ) : null}
        {vendor.contacts ? (
          <Text style={styles.metaLine}>{vendor.contacts}</Text>
        ) : null}
        {vendor.notes ? (
          <Text style={styles.notes}>{vendor.notes}</Text>
        ) : null}

        {vendor.menu?.map((section) => (
          <View key={section.title} style={styles.menuSection}>
            <Text style={styles.menuTitle}>{section.title}</Text>
            {section.items.map((item) => (
              <View key={`${section.title}-${item.name}`} style={styles.menuRow}>
                <View style={styles.menuItemText}>
                  <Text style={styles.menuItemName}>{item.name}</Text>
                  {item.portion ? (
                    <Text style={styles.menuItemPortion}>{item.portion}</Text>
                  ) : null}
                  {item.description ? (
                    <Text style={styles.menuItemDesc}>{item.description}</Text>
                  ) : null}
                </View>
                <Text style={styles.menuItemPrice}>{item.price}</Text>
              </View>
            ))}
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xs,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
    minHeight: 48,
    marginTop: spacing.md,
    borderRadius: 24,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  mapButtonText: {
    ...typography.button,
    color: colors.primaryText,
  },
  metaLine: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  notes: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  menuSection: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  menuTitle: {
    ...typography.artistName,
    color: colors.primary,
    fontSize: 15,
    marginBottom: spacing.xs,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuItemText: {
    flex: 1,
    minWidth: 0,
  },
  menuItemName: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
  },
  menuItemPortion: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'none',
    letterSpacing: 0,
    marginTop: 2,
  },
  menuItemDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: 'none',
    letterSpacing: 0,
    marginTop: 2,
    lineHeight: 16,
  },
  menuItemPrice: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xxxl,
  },
});
