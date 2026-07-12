import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CategoryPillBar } from '../components/CategoryPillBar';
import { HeadlinerCard } from '../components/HeadlinerCard';
import { ScreenTitle } from '../components/ScreenTitle';
import { useAppData } from '../context/DataContext';
import { HeadlinersStackParamList, MoreStackParamList } from '../navigation/types';
import {
  buildHeadlinerYearCategories,
  filterHeadlinersByYear,
  getDefaultHeadlinerYear,
  getHeadlinerYears,
} from '../utils/headlinerHelpers';
import { colors } from '../theme/colors';
import { screenHeaderStyle } from '../theme/layout';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = NativeStackScreenProps<
  HeadlinersStackParamList | MoreStackParamList,
  'HeadlinersMain'
>;

export function HeadlinersScreen({ navigation }: Props) {
  const { data } = useAppData();
  const years = useMemo(() => getHeadlinerYears(data.headliners), [data.headliners]);
  const defaultYear = useMemo(
    () => getDefaultHeadlinerYear(data.headliners, data.festival.year),
    [data.festival.year, data.headliners],
  );
  const [selectedYear, setSelectedYear] = useState(String(defaultYear));

  const yearCategories = useMemo(() => buildHeadlinerYearCategories(years), [years]);
  const items = useMemo(
    () => filterHeadlinersByYear(data.headliners, Number(selectedYear)),
    [data.headliners, selectedYear],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <ScreenTitle style={styles.title}>ХЭДЛАЙНЕРЫ</ScreenTitle>
      </View>

      {yearCategories.length > 1 ? (
        <View style={styles.tabsWrap}>
          <CategoryPillBar
            categories={yearCategories}
            selectedId={selectedYear}
            onSelect={setSelectedYear}
            variant="food"
          />
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {items.length > 0 ? (
          items.map((headliner) => (
            <HeadlinerCard
              key={headliner.id}
              headliner={headliner}
              onPress={() => navigation.navigate('HeadlinerDetail', { headlinerId: headliner.id })}
            />
          ))
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Список хэдлайнеров для этого года пока пуст</Text>
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
    textAlign: 'center',
  },
});
