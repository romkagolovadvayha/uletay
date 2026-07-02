import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';

type Props = {
  compact?: boolean;
};

export function LiveBadge({ compact }: Props) {
  return (
    <View style={[styles.badge, compact && styles.compact]}>
      <Text style={[styles.text, compact && styles.compactText]}>LIVE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.live,
    borderRadius: radius.sm - 2,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  compact: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  text: {
    ...typography.liveBadge,
    color: colors.text,
    fontSize: 11,
  },
  compactText: {
    fontSize: 9,
  },
});
