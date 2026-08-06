import { Image, ImageStyle } from 'expo-image';
import React, { useMemo, useState } from 'react';
import { Platform, StyleProp } from 'react-native';
import { resolveFestivalLogoSourceChain } from '../utils/imageSource';

type Props = {
  logoImageUrl?: string | null;
  style?: StyleProp<ImageStyle>;
};

export function FestivalLogoImage({ logoImageUrl, style }: Props) {
  const chain = useMemo(
    () => resolveFestivalLogoSourceChain(logoImageUrl),
    [logoImageUrl],
  );
  const [index, setIndex] = useState(0);
  const source = chain[Math.min(index, chain.length - 1)];

  return (
    <Image
      key={`${logoImageUrl ?? 'default'}:${index}`}
      source={source}
      style={style}
      contentFit="contain"
      accessibilityLabel="Логотип фестиваля УЛЕТАЙ"
      alt="Логотип фестиваля УЛЕТАЙ"
      priority="high"
      loading={Platform.OS === 'web' ? 'eager' : undefined}
      recyclingKey={`${logoImageUrl ?? 'default'}:${index}`}
      onError={() => setIndex((current) => Math.min(current + 1, chain.length - 1))}
    />
  );
}
