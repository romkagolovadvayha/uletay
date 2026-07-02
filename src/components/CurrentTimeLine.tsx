import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = {
  time?: string;
};

export function CurrentTimeLine({ time }: Props) {
  return (
    <View style={styles.wrap}>
      {time ? <Text style={styles.time}>{time}</Text> : <View style={styles.timeSpacer} />}
      <View style={styles.line} />
      <View style={styles.dot} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xs,
    minHeight: 20,
  },
  time: {
    width: 52,
    ...typography.scheduleTime,
    color: colors.live,
    fontSize: 13,
  },
  timeSpacer: {
    width: 52,
  },
  line: {
    flex: 1,
    height: 1.5,
    backgroundColor: colors.live,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.live,
    marginLeft: -1,
  },
});
