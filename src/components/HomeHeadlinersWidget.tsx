import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HeadlinerCard } from './HeadlinerCard';
import { PrimaryButton } from './PrimaryButton';
import { SectionHeader } from './SectionHeader';
import { useAppData } from '../context/DataContext';
import { Headliner } from '../types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { filterHeadlinersByYear, sortHeadlinersByPopularity } from '../utils/headlinerHelpers';

type Props = {
  year?: number;
  limit?: number;
  title?: string;
  moreLabel?: string;
  hint?: string;
  onPressHeadliner: (headliner: Headliner) => void;
  onPressAll: () => void;
};

export function HomeHeadlinersWidget({
  year,
  limit = 5,
  title,
  moreLabel = 'ВСЕ ХЭДЛАЙНЕРЫ',
  hint = 'Анонсированные артисты фестиваля',
  onPressHeadliner,
  onPressAll,
}: Props) {
  const { data } = useAppData();

  const headliners = useMemo(() => {
    const list =
      year != null
        ? filterHeadlinersByYear(data.headliners, year)
        : sortHeadlinersByPopularity(data.headliners);
    return list.slice(0, limit);
  }, [data.headliners, limit, year]);

  if (headliners.length === 0) {
    return null;
  }

  const sectionTitle = title ?? (year != null ? `ХЭДЛАЙНЕРЫ ${year}` : 'ХЭДЛАЙНЕРЫ');

  return (
    <View style={styles.wrap}>
      <SectionHeader title={sectionTitle} />
      {headliners.map((headliner) => (
        <HeadlinerCard
          key={headliner.id}
          headliner={headliner}
          allHeadliners={data.headliners}
          onPress={() => onPressHeadliner(headliner)}
        />
      ))}
      <PrimaryButton label={moreLabel} onPress={onPressAll} />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  hint: {
    ...typography.body,
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
