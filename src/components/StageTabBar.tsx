import React from 'react';
import { View } from 'react-native';
import { FilterTabs } from './FilterTabs';
import { Stage, StageId } from '../types';
import { spacing } from '../theme/spacing';
type Props = { stages: Stage[]; selectedStageId: StageId; onSelect: (id: StageId) => void };
export function StageTabBar({ stages, selectedStageId, onSelect }: Props) {
  return <View style={{ paddingBottom: spacing.md }}>
    <FilterTabs label="Сцены" value={selectedStageId} onChange={onSelect} inset={spacing.screen}
      items={stages.map(stage => ({ id: stage.id, label: stage.shortName }))} />
  </View>;
}
