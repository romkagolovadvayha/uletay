export type ImagePreset = 'artist' | 'hero' | 'thumb' | 'logo' | 'list';

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
  /** List/card thumbs (52–76 CSS px @2x). */
  list: {
    width: 160,
    height: 160,
    label: '160×160',
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
    width: 720,
    height: 288,
    label: '720×288',
  },
};

/** Display size for festival logo in the hero (~360 CSS px wide @1.5–2x). */
export const LOGO_SM = {
  width: 540,
  height: 216,
  quality: 78,
} as const;

/** Presets that also write a sibling `*-list.webp` for small UI. */
export const PRESETS_WITH_LIST_VARIANT: ReadonlySet<ImagePreset> = new Set(['artist', 'thumb']);

/** Derive list sibling URL: `foo.webp` → `foo-list.webp`. */
export function toListImageUrl(url: string): string {
  return url.replace(/(\.webp)(\?[^#]*)?(#.*)?$/i, '-list$1$2$3');
}

export function listFilenameFromFull(filename: string): string {
  return filename.replace(/(\.webp)$/i, '-list$1');
}

/** Derive logo display sibling: `foo.webp` → `foo-sm.webp`. */
export function toLogoSmUrl(url: string): string {
  if (/-sm\.webp(\?|#|$)/i.test(url)) {
    return url;
  }
  return url.replace(/(\.webp)(\?[^#]*)?(#.*)?$/i, '-sm$1$2$3');
}

export function logoSmFilenameFromFull(filename: string): string {
  return filename.replace(/(\.webp)$/i, '-sm$1');
}

export function presetHint(preset: ImagePreset): string {
  const { label } = IMAGE_PRESETS[preset];
  return `Обрежется до ${label}, сохранится как WebP`;
}
