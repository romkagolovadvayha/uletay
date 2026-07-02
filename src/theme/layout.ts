import { ViewStyle } from 'react-native';
import { spacing } from './spacing';

export const screenHeaderStyle: ViewStyle = {
  paddingHorizontal: spacing.screen,
  paddingTop: spacing.headerTop,
  paddingBottom: spacing.headerBottom,
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
