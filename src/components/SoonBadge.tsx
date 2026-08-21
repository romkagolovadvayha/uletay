import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';

type Props = {
  compact?: boolean;
  countdown?: string;
};

export function SoonBadge({ compact, countdown }: Props) {
  return (
    <View style={[styles.badge, compact && styles.compact, countdown && styles.withCountdown]}>
      <Text style={[styles.text, compact && styles.compactText]}>СКОРО</Text>
      {countdown ? (
        <Text style={[styles.countdown, compact && styles.compactCountdown]} numberOfLines={1}>
          {countdown}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm - 2,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  compact: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  withCountdown: {
    alignItems: 'center',
    minWidth: 72,
  },
  text: {
    ...typography.liveBadge,
    color: colors.primaryText,
    fontSize: 12,
  },
  compactText: {
    fontSize: 12,
  },
  countdown: {
    ...typography.caption,
    color: colors.primaryText,
    fontSize: 12,
    lineHeight: 10,
    marginTop: 1,
    textTransform: 'none',
    letterSpacing: 0,
  },
  compactCountdown: {
    fontSize: 12,
    lineHeight: 9,
  },
});
