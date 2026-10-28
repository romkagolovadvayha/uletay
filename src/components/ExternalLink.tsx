import React from 'react';
import {
  Platform,
  StyleProp,
  StyleSheet,
  ViewStyle,
  type PressableStateCallbackType,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { motion } from '../theme/motion';
import { EXTERNAL_LINK_REL, openExternalUrl } from '../utils/openExternalUrl';
import { MotionPressable } from './MotionPressable';

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
  const [pointerPressed, setPointerPressed] = React.useState(false);
  const reduceMotion = useReducedMotion();

  if (Platform.OS === 'web') {
    // Ticket sales links are disabled on the website, including links from the CMS.
    if (/^https?:\/\/(?:www\.)?drivegrup\.ru\/ticket(?:[/?#]|$)/i.test(href)) {
      return null;
    }

    const flatStyle =
      typeof style === 'function' ? style({ pressed: pointerPressed }) : style;

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
        style={{
          ...toWebLinkStyle(flatStyle),
          transform: pointerPressed && !reduceMotion ? 'scale(0.97)' : 'scale(1)',
          transition: reduceMotion
            ? 'none'
            : motion.pressTransitionCss,
        }}
        onPointerDown={() => setPointerPressed(true)}
        onPointerUp={() => setPointerPressed(false)}
        onPointerCancel={() => setPointerPressed(false)}
        onPointerLeave={() => setPointerPressed(false)}
      >
        {children}
      </a>
    );
  }

  return (
    <MotionPressable
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
    </MotionPressable>
  );
}
