import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { FoodCourtVendor } from '../types';
import { getFoodCourtPriceLabel } from '../utils/foodCourtHelpers';
import { getRemoteImageSource, getRemoteListImageSource } from '../utils/imageSource';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { MotionPressable } from './MotionPressable';

type Props = {
  vendor: FoodCourtVendor;
  onPress?: () => void;
  large?: boolean;
};

function getCategoryIcon(category: FoodCourtVendor['category']): keyof typeof Ionicons.glyphMap {
  switch (category) {
    case 'drinks':
      return 'cafe';
    case 'desserts':
      return 'ice-cream';
    default:
      return 'restaurant';
  }
}

function FoodCourtThumbnail({ vendor, large }: { vendor: FoodCourtVendor; large?: boolean }) {
  const size = large ? 220 : 72;
  const [useFull, setUseFull] = useState(large);
  const listSource = !large ? getRemoteListImageSource(vendor.imageUrl) : undefined;
  const source = vendor.imageUrl
    ? useFull || !listSource
      ? getRemoteImageSource(vendor.imageUrl)
      : listSource
    : undefined;

  if (source) {
    return (
      <Image
        source={source}
        style={[styles.thumb, { width: size, height: size, borderRadius: large ? radius.xl : radius.md }]}
        contentFit="cover"
        allowDownscaling
        cachePolicy="disk"
        decodeFormat={large ? 'argb' : 'rgb'}
        recyclingKey={`${vendor.id}:${useFull ? 'full' : 'list'}`}
        accessibilityLabel={vendor.name}
        alt={vendor.name}
        priority={large ? 'high' : 'low'}
        loading={Platform.OS === 'web' ? (large ? 'eager' : 'lazy') : undefined}
        onError={() => {
          if (!useFull) {
            setUseFull(true);
          }
        }}
      />
    );
  }

  return (
    <LinearGradient
      colors={[vendor.imageTint, colors.fallbackGradientEnd]}
      style={[styles.thumb, { width: size, height: size, borderRadius: large ? radius.xl : radius.md }]}
    >
      <Ionicons name={getCategoryIcon(vendor.category)} size={large ? 48 : 28} color={colors.primary} />
    </LinearGradient>
  );
}

export function FoodCourtCard({ vendor, onPress, large }: Props) {
  if (large) {
    return (
      <View style={styles.heroWrap}>
        <FoodCourtThumbnail vendor={vendor} large />
      </View>
    );
  }

  return (
    <MotionPressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.card}
    >
      <FoodCourtThumbnail vendor={vendor} />
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {vendor.name.toUpperCase()}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {vendor.description}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.price}>{getFoodCourtPriceLabel(vendor)}</Text>
          <Text style={styles.distance}>{vendor.distance}</Text>
        </View>
      </View>
    </MotionPressable>
  );
}

export { FoodCourtThumbnail };

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceCard,
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  name: {
    ...typography.artistName,
    color: colors.text,
    fontSize: 14,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  price: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: 'none',
    letterSpacing: 0,
    fontWeight: '500',
  },
  distance: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'none',
    letterSpacing: 0,
  },
  heroWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
});
