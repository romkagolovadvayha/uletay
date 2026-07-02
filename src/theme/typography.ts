import { TextStyle } from 'react-native';

export const fonts = {
  regular: 'Montserrat_400Regular',
  medium: 'Montserrat_500Medium',
  semiBold: 'Montserrat_600SemiBold',
  bold: 'Montserrat_700Bold',
  extraBold: 'Montserrat_800ExtraBold',
  black: 'Montserrat_900Black',
} as const;

export const typography = {
  logoTagline: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  logoMain: {
    fontFamily: fonts.black,
    fontSize: 46,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  logoYear: {
    fontFamily: fonts.black,
    fontSize: 30,
    letterSpacing: 0.5,
  } satisfies TextStyle,
  logoDates: {
    fontFamily: fonts.bold,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  location: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  screenTitle: {
    fontFamily: fonts.black,
    fontSize: 22,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  screenSubtitle: {
    fontFamily: fonts.extraBold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  sectionTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  sectionMuted: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  countdownTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  countdownValue: {
    fontFamily: fonts.black,
    fontSize: 32,
    letterSpacing: -0.5,
  } satisfies TextStyle,
  countdownLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  button: {
    fontFamily: fonts.extraBold,
    fontSize: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  artistName: {
    fontFamily: fonts.extraBold,
    fontSize: 17,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  artistStage: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  artistTime: {
    fontFamily: fonts.medium,
    fontSize: 13,
    letterSpacing: 0.1,
  } satisfies TextStyle,
  heroArtist: {
    fontFamily: fonts.black,
    fontSize: 36,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  heroStage: {
    fontFamily: fonts.extraBold,
    fontSize: 13,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  scheduleTime: {
    fontFamily: fonts.extraBold,
    fontSize: 14,
    letterSpacing: 0.1,
  } satisfies TextStyle,
  scheduleArtist: {
    fontFamily: fonts.bold,
    fontSize: 13,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  tabLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.1,
  } satisfies TextStyle,
  liveBadge: {
    fontFamily: fonts.extraBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  body: {
    fontFamily: fonts.medium,
    fontSize: 14,
    letterSpacing: 0.1,
  } satisfies TextStyle,
  caption: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  } satisfies TextStyle,
} as const;
