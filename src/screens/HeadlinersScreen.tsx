import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeadlinerCard } from '../components/HeadlinerCard';
import { HeadlinerFilterBar } from '../components/HeadlinerFilterBar';
import { ScreenTitle } from '../components/ScreenTitle';
import { useAppData } from '../context/DataContext';
import { HeadlinersStackParamList, MoreStackParamList } from '../navigation/types';
import {
  buildHeadlinerYearCategories,
  filterHeadlinersList,
  getDefaultHeadlinerYear,
  getHeadlinerYears,
  type HeadlinerSortMode,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<HeadlinerSortMode>('popularity');

  const yearCategories = useMemo(() => buildHeadlinerYearCategories(years), [years]);
  const items = useMemo(
    () =>
      filterHeadlinersList(data.headliners, {
        year: Number(selectedYear),
        query: searchQuery,
        sort: sortMode,
      }),
    [data.headliners, searchQuery, selectedYear, sortMode],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <ScreenTitle style={styles.title}>ХЭДЛАЙНЕРЫ</ScreenTitle>
      </View>

      <View style={styles.filtersWrap}>
        <HeadlinerFilterBar
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          selectedYear={selectedYear}
          yearOptions={yearCategories}
          onYearChange={setSelectedYear}
          sortMode={sortMode}
          onSortModeChange={setSortMode}
        />
      </View>

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
            <Text style={styles.emptyText}>
              {searchQuery.trim()
                ? 'Ничего не найдено — попробуйте другой запрос'
                : 'Список хэдлайнеров для этого года пока пуст'}
            </Text>
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
  filtersWrap: {
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
