import { Platform, TextStyle } from 'react-native';

export const fonts = {
  regular: 'Montserrat_400Regular',
  medium: 'Montserrat_500Medium',
  semiBold: 'Montserrat_600SemiBold',
  bold: 'Montserrat_700Bold',
  extraBold: 'Montserrat_800ExtraBold',
  black: 'Montserrat_900Black',
} as const;

export type FontKey = keyof typeof fonts;

const webWeights: Record<FontKey, TextStyle['fontWeight']> = {
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  extraBold: '800',
  black: '900',
};

export function appFont(key: FontKey): Pick<TextStyle, 'fontFamily' | 'fontWeight'> {
  if (Platform.OS === 'web') {
    return { fontFamily: 'Montserrat', fontWeight: webWeights[key] };
  }
  return { fontFamily: fonts[key] };
}

function font(key: FontKey): Pick<TextStyle, 'fontFamily' | 'fontWeight'> {
  return appFont(key);
}

export const typography = {
  logoTagline: {
    ...font('bold'),
    fontSize: 9,
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
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  countdownTitle: {
    ...font('semiBold'),
    fontSize: 10,
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
    fontSize: 9,
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
    fontSize: 11,
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
    fontSize: 10,
    letterSpacing: 0.1,
  } satisfies TextStyle,
  liveBadge: {
    ...font('extraBold'),
    fontSize: 10,
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
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  } satisfies TextStyle,
} as const;
