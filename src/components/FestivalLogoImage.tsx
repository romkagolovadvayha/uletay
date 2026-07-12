import { Image, ImageStyle } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { StyleProp } from 'react-native';
import { BUNDLED_FESTIVAL_LOGO, resolveFestivalLogoSource } from '../utils/imageSource';

type Props = {
  logoImageUrl?: string | null;
  style?: StyleProp<ImageStyle>;
};

export function FestivalLogoImage({ logoImageUrl, style }: Props) {
  const [useBundledFallback, setUseBundledFallback] = useState(false);

  useEffect(() => {
    setUseBundledFallback(false);
  }, [logoImageUrl]);

  const source = useBundledFallback
    ? BUNDLED_FESTIVAL_LOGO
    : resolveFestivalLogoSource(logoImageUrl);

  return (
    <Image
      key={useBundledFallback ? 'bundled' : (logoImageUrl ?? 'default')}
      source={source}
      style={style}
      contentFit="contain"
      recyclingKey={logoImageUrl ?? 'default'}
      onError={() => setUseBundledFallback(true)}
    />
  );
}
