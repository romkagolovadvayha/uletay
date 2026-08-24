import { Platform, type PressableProps } from 'react-native';

type WebKeyboardEvent = {
  nativeEvent: { key: string };
  preventDefault?: () => void;
};

/** React Native Web 0.21 does not activate role-based Pressables from the keyboard. */
export function webKeyboardActivationProps(
  onActivate?: () => void,
  disabled: boolean | null | undefined = false,
): PressableProps {
  if (Platform.OS !== 'web' || !onActivate || disabled) return {};

  return {
    onKeyDown: (event: WebKeyboardEvent) => {
      if (event.nativeEvent.key !== 'Enter' && event.nativeEvent.key !== ' ') return;
      event.preventDefault?.();
      onActivate();
    },
  } as unknown as PressableProps;
}
