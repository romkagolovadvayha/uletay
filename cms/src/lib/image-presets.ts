export type ImagePreset = 'artist' | 'hero' | 'thumb' | 'logo';

export type ImagePresetConfig = {
  width: number;
  height: number;
  label: string;
};

export const IMAGE_PRESETS: Record<ImagePreset, ImagePresetConfig> = {
  artist: {
    width: 800,
    height: 800,
    label: '800×800',
  },
  hero: {
    width: 1200,
    height: 675,
    label: '1200×675',
  },
  thumb: {
    width: 440,
    height: 440,
    label: '440×440',
  },
  logo: {
    width: 900,
    height: 360,
    label: '900×360',
  },
};

export function presetHint(preset: ImagePreset): string {
  const { label } = IMAGE_PRESETS[preset];
  return `Обрежется до ${label}, сохранится как WebP`;
}
