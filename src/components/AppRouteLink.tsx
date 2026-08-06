import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type Props = {
  href: string;
  children: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

function toWebStyle(style: StyleProp<ViewStyle>): React.CSSProperties {
  const flat = StyleSheet.flatten(style) ?? {};
  const { paddingHorizontal, paddingVertical, marginHorizontal, marginVertical, ...rest } = flat;

  return {
    color: 'inherit',
    textDecoration: 'none',
    boxSizing: 'border-box',
    ...rest,
    ...(paddingHorizontal != null
      ? { paddingLeft: paddingHorizontal, paddingRight: paddingHorizontal }
      : {}),
    ...(paddingVertical != null
      ? { paddingTop: paddingVertical, paddingBottom: paddingVertical }
      : {}),
    ...(marginHorizontal != null
      ? { marginLeft: marginHorizontal, marginRight: marginHorizontal }
      : {}),
    ...(marginVertical != null
      ? { marginTop: marginVertical, marginBottom: marginVertical }
      : {}),
  } as React.CSSProperties;
}

export function AppRouteLink({
  href,
  children,
  onPress,
  accessibilityLabel,
  style,
}: Props) {
  if (Platform.OS === 'web') {
    return (
      <a
        href={href}
        aria-label={accessibilityLabel}
        style={toWebStyle(style)}
        onClick={(event) => {
          if (
            !onPress ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
          ) {
            return;
          }
          event.preventDefault();
          onPress();
        }}
      >
        {children}
      </a>
    );
  }

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={style}
    >
      {children}
    </Pressable>
  );
}
