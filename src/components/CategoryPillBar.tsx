import React from 'react';
import { View } from 'react-native';
import { FilterTabs } from './FilterTabs';
import { spacing } from '../theme/spacing';
type Props = { categories: { id: string; label: string }[]; selectedId: string; onSelect: (id: string) => void; variant?: 'food' | 'default' };
export function CategoryPillBar({ categories, selectedId, onSelect }: Props) {
  return <View style={{ paddingBottom: spacing.md }}>
    <FilterTabs label="Категории" role="radiogroup" items={categories} value={selectedId} onChange={onSelect} />
  </View>;
}
