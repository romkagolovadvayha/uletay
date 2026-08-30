import { TextStyle } from 'react-native';

/** Three Montserrat files only; heavier keys alias to Regular/Bold for LCP. */
export const fonts = {
  regular: 'Montserrat_400Regular',
  medium: 'Montserrat_400Regular',
  semiBold: 'Montserrat_600SemiBold',
  bold: 'Montserrat_700Bold',
  extraBold: 'Montserrat_700Bold',
  black: 'Montserrat_700Bold',
} as const;

export const webFontFamily = "'Montserrat', 'Segoe UI', system-ui, sans-serif";

export type FontKey = keyof typeof fonts;

function font(key: FontKey): Pick<TextStyle, 'fontFamily'> {
  return { fontFamily: fonts[key] };
}

export function appFont(key: FontKey): Pick<TextStyle, 'fontFamily'> {
  return font(key);
}

export const typography = {
  logoTagline: {
    ...font('bold'),
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  logoMain: {
    ...font('black'),
    fontSize: 46,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  logoYear: {
    ...font('black'),
    fontSize: 30,
    letterSpacing: 0.5,
  } satisfies TextStyle,
  logoDates: {
    ...font('bold'),
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  location: {
    ...font('bold'),
    fontSize: 12,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  screenTitle: {
    ...font('black'),
    fontSize: 22,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  screenSubtitle: {
    ...font('extraBold'),
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  sectionTitle: {
    ...font('extraBold'),
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  sectionMuted: {
    ...font('semiBold'),
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  countdownTitle: {
    ...font('semiBold'),
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  countdownValue: {
    ...font('black'),
    fontSize: 32,
    letterSpacing: -0.5,
  } satisfies TextStyle,
  countdownLabel: {
    ...font('semiBold'),
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  button: {
    ...font('extraBold'),
    fontSize: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  artistName: {
    ...font('extraBold'),
    fontSize: 17,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  artistStage: {
    ...font('bold'),
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  artistTime: {
    ...font('medium'),
    fontSize: 13,
    letterSpacing: 0.1,
  } satisfies TextStyle,
  heroArtist: {
    ...font('black'),
    fontSize: 36,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  heroStage: {
    ...font('extraBold'),
    fontSize: 13,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  scheduleTime: {
    ...font('extraBold'),
    fontSize: 14,
    letterSpacing: 0.1,
  } satisfies TextStyle,
  scheduleArtist: {
    ...font('bold'),
    fontSize: 13,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  tabLabel: {
    ...font('bold'),
    fontSize: 12,
    letterSpacing: 0.1,
  } satisfies TextStyle,
  liveBadge: {
    ...font('extraBold'),
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  body: {
    ...font('medium'),
    fontSize: 14,
    letterSpacing: 0.1,
  } satisfies TextStyle,
  caption: {
    ...font('semiBold'),
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  } satisfies TextStyle,
} as const;
