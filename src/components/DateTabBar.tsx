import React from 'react';
import { View } from 'react-native';
import { FilterTabs } from './FilterTabs';
import { spacing } from '../theme/spacing';
import { formatDateTabParts } from '../utils/scheduleHelpers';

type Props = { dates: string[]; selectedDate: string; onSelect: (date: string) => void; variant?: 'red' | 'yellow' };
export function DateTabBar({ dates, selectedDate, onSelect }: Props) {
  return <View style={{ paddingBottom: spacing.md / 2 }}>
    <FilterTabs layout="dates" label="Дни фестиваля" value={selectedDate} onChange={onSelect}
      items={dates.map(date => {
        const { day, month, weekday } = formatDateTabParts(date);
        return { id: date, label: day, caption: month, detail: weekday.slice(0, 3), accessibilityLabel: `${day} ${month}, ${weekday}` };
      })} />
  </View>;
}
