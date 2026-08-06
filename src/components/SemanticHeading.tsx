import React, { createElement } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
} from 'react-native';

type Props = {
  children: React.ReactNode;
  level: 1 | 2 | 3;
  style?: StyleProp<TextStyle>;
};

const webReset: TextStyle = {
  margin: 0,
  padding: 0,
};

export function SemanticHeading({ children, level, style }: Props) {
  if (Platform.OS === 'web') {
    const flattenedStyle = StyleSheet.flatten([webReset, style]);
    const webStyle = {
      ...flattenedStyle,
      ...(typeof flattenedStyle.lineHeight === 'number'
        ? { lineHeight: `${flattenedStyle.lineHeight}px` }
        : {}),
    } as React.CSSProperties;

    return createElement(
      `h${level}`,
      { style: webStyle },
      children,
    );
  }

  return (
    <Text accessibilityRole="header" style={style}>
      {children}
    </Text>
  );
}
