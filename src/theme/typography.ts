import { Platform, type TextStyle } from 'react-native';

export const webFontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
const fontFamily = Platform.OS === 'web' ? webFontFamily : Platform.OS === 'ios' ? 'System' : 'sans-serif';
export const fonts = {
  regular: fontFamily, medium: fontFamily, semiBold: fontFamily,
  bold: fontFamily, extraBold: fontFamily, black: fontFamily,
} as const;
export type FontKey = keyof typeof fonts;
const weights = { regular: '400', medium: '500', semiBold: '600', bold: '700', extraBold: '700', black: '700' } as const;

export function appFont(key: FontKey): Pick<TextStyle, 'fontFamily' | 'fontWeight'> {
  return { fontFamily, fontWeight: weights[key] };
}

function text(size: number, lineHeight: number, weight: FontKey = 'regular', letterSpacing = 0): TextStyle {
  return { ...appFont(weight), fontSize: size, lineHeight, letterSpacing, textTransform: 'none' };
}

export const typography = {
  logoTagline: text(12, 16, 'semiBold', 0.4),
  logoMain: text(46, 50, 'bold', -1.2),
  logoYear: text(30, 36, 'bold', -0.5),
  logoDates: text(13, 18, 'semiBold'),
  location: text(13, 18, 'medium'),
  screenTitle: text(34, 40, 'bold', -0.8),
  screenSubtitle: text(15, 20, 'medium'),
  sectionTitle: text(20, 26, 'semiBold', -0.3),
  sectionMuted: text(13, 18, 'medium'),
  countdownTitle: text(13, 18, 'medium'),
  countdownValue: text(32, 38, 'bold', -0.5),
  countdownLabel: text(12, 16),
  button: text(17, 22, 'semiBold', -0.2),
  artistName: text(17, 22, 'semiBold', -0.2),
  artistStage: text(13, 18, 'medium'),
  artistTime: text(15, 20, 'medium'),
  heroArtist: text(36, 42, 'bold', -0.8),
  heroStage: text(15, 20, 'semiBold'),
  scheduleTime: text(14, 18, 'semiBold'),
  scheduleArtist: text(14, 18, 'semiBold'),
  tabLabel: text(11, 14, 'medium'),
  liveBadge: text(12, 16, 'semiBold', 0.2),
  body: text(17, 24),
  caption: text(13, 18),
} as const;
