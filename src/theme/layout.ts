import { Platform,ViewStyle } from 'react-native';
import { spacing } from './spacing';

export const screenHeaderStyle: ViewStyle = {
  paddingHorizontal: spacing.screen,
  paddingTop: Platform.OS==='web'?spacing.headerTop:14,
  paddingBottom: Platform.OS==='web'?spacing.headerBottom:12,
};

export const screenHeaderRowStyle: ViewStyle = {
  ...screenHeaderStyle,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
};

export const screenTitleSpacing: ViewStyle = {
  marginTop: spacing.headerTop,
  marginBottom: spacing.headerBottom,
};

export const sectionHeaderSpacing: ViewStyle = {
  marginTop: spacing.sectionHeaderTop,
  marginBottom: spacing.sectionHeaderBottom,
};

export const sectionHeaderSpacingMuted: ViewStyle = {
  marginTop: spacing.sectionHeaderTop,
  marginBottom: spacing.sectionHeaderBottom,
};
