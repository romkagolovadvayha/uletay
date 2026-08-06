import React, { createElement } from 'react';
import { Platform, StyleSheet, Text, TextProps, TextStyle } from 'react-native';

const webHeadingReset: TextStyle =
  Platform.OS === 'web'
    ? {
        margin: 0,
        padding: 0,
        borderWidth: 0,
      }
    : {};

type Props = Pick<TextProps, 'numberOfLines' | 'accessibilityLabel'> & {
  children: TextProps['children'];
  style?: TextStyle | TextStyle[];
};

export function ScreenTitle({ children, style, numberOfLines, accessibilityLabel }: Props) {
  const flattenedStyle = StyleSheet.flatten([webHeadingReset, style]);

  if (Platform.OS === 'web') {
    const webStyle = {
      ...flattenedStyle,
      ...(typeof flattenedStyle.lineHeight === 'number'
        ? { lineHeight: `${flattenedStyle.lineHeight}px` }
        : {}),
    } as React.CSSProperties;

    return createElement(
      'h1',
      {
        style: webStyle,
        'aria-label': accessibilityLabel,
      },
      children,
    );
  }

  return (
    <Text style={style} numberOfLines={numberOfLines} accessibilityLabel={accessibilityLabel}>
      {children}
    </Text>
  );
}
