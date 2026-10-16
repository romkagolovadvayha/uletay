import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeadlinerCard } from '../components/HeadlinerCard';
import { HeadlinerFilterBar } from '../components/HeadlinerFilterBar';
import { ScreenTitle } from '../components/ScreenTitle';
import { useAppData } from '../context/DataContext';
import { useIsDesktopWeb } from '../hooks/useIsDesktopWeb';
import { HeadlinersStackParamList, MoreStackParamList } from '../navigation/types';
import {
  buildHeadlinerYearCategories,
  filterHeadlinersList,
  getPreviousHeadlinerYears,
  getSelectableHeadlinerYears,
  type HeadlinerSortMode,
} from '../utils/headlinerHelpers';
import { colors } from '../theme/colors';
import { screenHeaderStyle } from '../theme/layout';
import { spacing } from '../theme/spacing';
import { appFont, typography } from '../theme/typography';

type Props = NativeStackScreenProps<
  HeadlinersStackParamList | MoreStackParamList,
  'HeadlinersMain'
>;

export function HeadlinersScreen({ navigation, route }: Props) {
  const { data } = useAppData();
  const isDesktop = useIsDesktopWeb();
  const years = useMemo(
    () => getSelectableHeadlinerYears(data.headliners, data.festival.year),
    [data.festival.year, data.headliners],
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<HeadlinerSortMode>('popularity');

  const activeYear = route.params?.year && /^\d{4}$/.test(route.params.year)
    ? route.params.year
    : String(data.festival.year);
  const isCurrentYear = Number(activeYear) === data.festival.year;

  const yearCategories = useMemo(() => buildHeadlinerYearCategories(years), [years]);
  const activeYearHasHeadliners = useMemo(
    () => data.headliners.some((headliner) => headliner.years.includes(Number(activeYear))),
    [activeYear, data.headliners],
  );
  const previousFestivalYear = useMemo(
    () =>
      activeYearHasHeadliners
        ? undefined
        : getPreviousHeadlinerYears(data.headliners, Number(activeYear), 1)[0],
    [activeYear, activeYearHasHeadliners, data.headliners],
  );
  const displayedYear = previousFestivalYear ?? Number(activeYear);
  const items = useMemo(
    () =>
      filterHeadlinersList(data.headliners, {
        year: displayedYear,
        query: searchQuery,
        sort: sortMode,
      }),
    [data.headliners, displayedYear, searchQuery, sortMode],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.header, isDesktop && styles.headerDesktop]}>
        <Text style={styles.desktopKicker}>
          {isCurrentYear ? `Кто будет на Улетай ${activeYear}?` : `Кто был на Улетай ${activeYear}?`}
        </Text>
        <ScreenTitle style={[styles.title, isDesktop ? styles.titleDesktop : {}]}>
          Хедлайнеры {activeYear}
        </ScreenTitle>
        {isDesktop ? (
          <Text style={styles.desktopLead}>
            {isCurrentYear
              ? 'Артисты фестиваля «Улетай» этого года.'
              : `Музыканты, выступавшие на фестивале «Улетай» в ${activeYear} году.`}
          </Text>
        ) : null}
      </View>

      <View style={[styles.filtersWrap, isDesktop && styles.filtersWrapDesktop]}>
        <HeadlinerFilterBar
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          selectedYear={activeYear}
          yearOptions={yearCategories}
          onYearChange={(year) => navigation.setParams({ year })}
          sortMode={sortMode}
          onSortModeChange={setSortMode}
        />
      </View>

      <FlatList
        key={isDesktop ? 'desktop-headliners' : 'mobile-headliners'}
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={isDesktop ? 3 : 1}
        columnWrapperStyle={isDesktop ? styles.columns : undefined}
        contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        renderItem={({ item: headliner }) => (
          <HeadlinerCard
            headliner={headliner}
            allHeadliners={data.headliners}
            desktopTile={isDesktop}
            onPress={() => navigation.navigate('HeadlinerDetail', { headlinerId: headliner.id })}
          />
        )}
        ListHeaderComponent={previousFestivalYear != null ? (
          <View style={styles.previousHeader}>
            <Text style={styles.emptyText}>
              Хэдлайнеры {activeYear} года ещё не объявлены
            </Text>
            <Text style={styles.previousTitle}>
              Хедлайнеры предыдущего фестиваля {previousFestivalYear}
            </Text>
          </View>
        ) : null}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {searchQuery.trim()
                ? 'Ничего не найдено — попробуйте другой запрос'
                : `Хэдлайнеры ${activeYear} года ещё не объявлены`}
            </Text>
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
  headerDesktop: {
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingTop: 42,
    paddingBottom: 26,
  },
  title: {
    ...typography.screenTitle,
    color: colors.text,
    textTransform: 'none',
  },
  titleDesktop: {
    ...appFont('black'),
    fontSize: 46,
    lineHeight: 50,
    letterSpacing: -1.8,
  },
  desktopKicker: {
    ...appFont('bold'),
    color: colors.primary,
    fontSize: 12,
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  desktopLead: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
  },
  filtersWrap: {
    paddingHorizontal: spacing.screen,
  },
  filtersWrapDesktop: {
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
    paddingHorizontal: 32,
    marginBottom: 24,
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
  contentDesktop: {
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingBottom: 48,
  },
  columns: {
    gap: 18,
  },
  previousHeader: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  previousTitle: {
    ...typography.screenSubtitle,
    color: colors.primary,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
});
