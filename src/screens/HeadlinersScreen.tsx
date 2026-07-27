import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
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
  getPreviousHeadlinerYears,
  getSelectableHeadlinerYears,
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
  const years = useMemo(
    () => getSelectableHeadlinerYears(data.headliners, data.festival.year),
    [data.festival.year, data.headliners],
  );
  const defaultYear = useMemo(
    () => getDefaultHeadlinerYear(data.headliners, data.festival.year),
    [data.festival.year, data.headliners],
  );
  const [selectedYear, setSelectedYear] = useState(String(defaultYear));
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<HeadlinerSortMode>('popularity');

  const activeYear = years.includes(Number(selectedYear)) ? selectedYear : String(defaultYear);

  const yearCategories = useMemo(() => buildHeadlinerYearCategories(years), [years]);
  const items = useMemo(
    () =>
      filterHeadlinersList(data.headliners, {
        year: Number(activeYear),
        query: searchQuery,
        sort: sortMode,
      }),
    [activeYear, data.headliners, searchQuery, sortMode],
  );
  const previousYears = useMemo(
    () => getPreviousHeadlinerYears(data.headliners, Number(activeYear), 3),
    [activeYear, data.headliners],
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
          selectedYear={activeYear}
          yearOptions={yearCategories}
          onYearChange={setSelectedYear}
          sortMode={sortMode}
          onSortModeChange={setSortMode}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        renderItem={({ item: headliner }) => (
          <HeadlinerCard
            headliner={headliner}
            allHeadliners={data.headliners}
            onPress={() => navigation.navigate('HeadlinerDetail', { headlinerId: headliner.id })}
          />
        )}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {searchQuery.trim()
                ? 'Ничего не найдено — попробуйте другой запрос'
                : `Хэдлайнеры ${activeYear} года ещё не объявлены`}
            </Text>
            {!searchQuery.trim() && previousYears.length > 0 ? (
              <View style={styles.emptyYears}>
                <Text style={styles.emptyHint}>Посмотреть другие годы</Text>
                <View style={styles.emptyButtons}>
                  {previousYears.map((year) => (
                    <Pressable
                      key={year}
                      accessibilityRole="button"
                      onPress={() => setSelectedYear(String(year))}
                      style={styles.emptyButton}
                    >
                      <Text style={styles.emptyButtonText}>{year}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        )}
      />
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
    fontSize: 15,
    textAlign: 'center',
  },
  emptyYears: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyHint: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
  },
  emptyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyButton: {
    minHeight: 44,
    minWidth: 88,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  emptyButtonText: {
    ...typography.body,
    color: colors.primary,
    fontSize: 14,
  },
});
