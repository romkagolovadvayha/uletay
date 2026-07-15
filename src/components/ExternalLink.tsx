import React from 'react';
import {
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
  type PressableStateCallbackType,
} from 'react-native';
import { EXTERNAL_LINK_REL, openExternalUrl } from '../utils/openExternalUrl';

function toWebLinkStyle(style: StyleProp<ViewStyle>): React.CSSProperties {
  const flat = StyleSheet.flatten(style) ?? {};
  const {
    paddingHorizontal,
    paddingVertical,
    marginHorizontal,
    marginVertical,
    ...rest
  } = flat;

  return {
    textDecoration: 'none',
    color: 'inherit',
    display: 'inline-flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    ...rest,
    ...(paddingVertical != null
      ? { paddingTop: paddingVertical, paddingBottom: paddingVertical }
      : {}),
    ...(paddingHorizontal != null
      ? { paddingLeft: paddingHorizontal, paddingRight: paddingHorizontal }
      : {}),
    ...(marginVertical != null
      ? { marginTop: marginVertical, marginBottom: marginVertical }
      : {}),
    ...(marginHorizontal != null
      ? { marginLeft: marginHorizontal, marginRight: marginHorizontal }
      : {}),
  } as React.CSSProperties;
}

type Props = {
  href: string;
  children: React.ReactNode;
  accessibilityLabel?: string;
  hitSlop?: number | { top: number; bottom: number; left: number; right: number };
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
  onPress?: () => void;
};

export function ExternalLink({
  href,
  children,
  style,
  accessibilityLabel,
  hitSlop,
  onPress,
}: Props) {
  if (Platform.OS === 'web') {
    const flatStyle = typeof style === 'function' ? style({ pressed: false }) : style;

    return (
      <a
        href={href}
        target="_blank"
        rel={EXTERNAL_LINK_REL}
        aria-label={accessibilityLabel}
        onClick={(event) => {
          event.stopPropagation();
          onPress?.();
        }}
        style={toWebLinkStyle(flatStyle)}
      >
        {children}
      </a>
    );
  }

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel}
      hitSlop={hitSlop}
      onPress={() => {
        onPress?.();
        openExternalUrl(href);
      }}
      style={style}
    >
      {children}
    </Pressable>
  );
}
