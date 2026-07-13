import React, { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors } from '../theme/colors';
import { openExternalUrl } from '../utils/openExternalUrl';
import { buildYandexMusicSearchUrl } from '../utils/yandexMusic';

const YANDEX_MUSIC_RED = '#F85234';

type Props = {
  artist: string;
  track: string;
  size?: number;
};

function YandexMusicIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Rect width={24} height={24} rx={6} fill={YANDEX_MUSIC_RED} />
      <Path
        d="M9.2 7.4c0-.5.4-.9 1-.9h3.6c2.8 0 5 2.2 5 5s-2.2 5-5 5h-2.1v2.1c0 .5-.4.9-1 .9s-1-.4-1-.9V7.4zm2 1.8v6.6h2.6c1.7 0 3.1-1.4 3.1-3.1s-1.4-3.1-3.1-3.1H11.2z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

export function YandexMusicLink({ artist, track, size = 34 }: Props) {
  const url = useMemo(() => buildYandexMusicSearchUrl(artist, track), [artist, track]);

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Открыть «${track}» в Яндекс Музыке`}
      hitSlop={6}
      onPress={() => openExternalUrl(url)}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && styles.pressed,
      ]}
    >
      <YandexMusicIcon size={Math.round(size * 0.62)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.72,
  },
});
