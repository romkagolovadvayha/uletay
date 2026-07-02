import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppData } from '../context/DataContext';
import { StageId } from '../types';
import { getStageDotColor } from '../utils/scheduleHelpers';

type Props = {
  stageId: StageId;
  size?: number;
};

export function StageDot({ stageId, size = 8 }: Props) {
  const { data } = useAppData();
  const color = getStageDotColor(stageId, data.stages);

  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    marginTop: 1,
  },
});
