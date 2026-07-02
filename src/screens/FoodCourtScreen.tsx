import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CategoryPillBar } from '../components/CategoryPillBar';
import { FoodCourtCard } from '../components/FoodCourtCard';
import { useAppData } from '../context/DataContext';
import { FoodCourtStackParamList } from '../navigation/types';
import { FOOD_COURT_CATEGORIES, FoodCourtFilter } from '../utils/foodCourtHelpers';
import { colors } from '../theme/colors';
import { screenHeaderStyle } from '../theme/layout';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = NativeStackScreenProps<FoodCourtStackParamList, 'FoodCourtMain'>;

export function FoodCourtScreen({ navigation }: Props) {
  const { data } = useAppData();
  const [selectedCategory, setSelectedCategory] = useState<FoodCourtFilter>('all');

  const vendors = useMemo(() => {
    if (selectedCategory === 'all') {
      return data.foodcourt;
    }
    return data.foodcourt.filter((vendor) => vendor.category === selectedCategory);
  }, [data.foodcourt, selectedCategory]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>ФУДКОРТ</Text>
      </View>

      <View style={styles.tabsWrap}>
        <CategoryPillBar
          categories={FOOD_COURT_CATEGORIES}
          selectedId={selectedCategory}
          onSelect={(id) => setSelectedCategory(id as FoodCourtFilter)}
          variant="food"
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {vendors.length > 0 ? (
          vendors.map((vendor) => (
            <FoodCourtCard
              key={vendor.id}
              vendor={vendor}
              onPress={() => navigation.navigate('FoodCourtDetail', { vendorId: vendor.id })}
            />
          ))
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Нет точек в этой категории</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: screenHeaderStyle,
  title: {
    ...typography.screenTitle,
    color: colors.text,
  },
  tabsWrap: {
    paddingHorizontal: spacing.screen,
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xxl,
  },
  empty: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
  },
});
