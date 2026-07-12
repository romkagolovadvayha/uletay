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
import { filterHeadlinersByYear } from '../utils/headlinerHelpers';

const PREVIEW_LIMIT = 5;

type Props = {
  year: number;
  onPressHeadliner: (headliner: Headliner) => void;
  onPressAll: () => void;
};

export function HomeHeadlinersWidget({ year, onPressHeadliner, onPressAll }: Props) {
  const { data } = useAppData();

  const headliners = useMemo(
    () => filterHeadlinersByYear(data.headliners, year).slice(0, PREVIEW_LIMIT),
    [data.headliners, year],
  );

  if (headliners.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <SectionHeader title={`ХЭДЛАЙНЕРЫ ${year}`} />
      {headliners.map((headliner) => (
        <HeadlinerCard
          key={headliner.id}
          headliner={headliner}
          onPress={() => onPressHeadliner(headliner)}
        />
      ))}
      <PrimaryButton label="ВСЕ ХЭДЛАЙНЕРЫ" onPress={onPressAll} />
      <Text style={styles.hint}>Анонсированные артисты фестиваля</Text>
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
