import { Platform, type PressableProps } from 'react-native';

type WebKeyboardEvent = {
  nativeEvent: { key: string; repeat?: boolean; altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean };
  currentTarget: HTMLElement;
  target: EventTarget | null;
  preventDefault?: () => void;
  stopPropagation?: () => void;
};

const TOGGLE_ROLES = new Set(['tab', 'radio', 'checkbox', 'switch', 'menuitem']);

function activationMode(event: WebKeyboardEvent): 'fallback' | 'native' | null {
  const { key, altKey, ctrlKey, metaKey } = event.nativeEvent;
  if (event.target !== event.currentTarget || altKey || ctrlKey || metaKey) return null;
  const tag = event.currentTarget.tagName.toLowerCase();
  const role = event.currentTarget.getAttribute('role');
  if (tag === 'button') return key === 'Enter' || key === ' ' ? 'native' : null;
  if (tag === 'a' || tag === 'input' || tag === 'select' || tag === 'textarea') return null;
  if (key === ' ' && TOGGLE_ROLES.has(role ?? '')) return 'fallback';
  if (key === 'Enter' && role === 'link') return 'fallback';
  if (key === 'Enter' || (key === ' ' && role === 'button')) return 'native';
  return null;
}

/** RN Web handles Enter and buttons itself; add Space for role-based controls. */
export function webKeyboardActivationProps(
  onActivate?: () => void,
  disabled: boolean | null | undefined = false,
): PressableProps {
  if (Platform.OS !== 'web' || !onActivate || disabled) return {};

  return {
    onKeyDown: (event: WebKeyboardEvent) => {
      const mode = activationMode(event);
      if (!mode) return;
      if (mode === 'fallback') {
        event.preventDefault?.();
        event.stopPropagation?.();
      }
      if (!event.nativeEvent.repeat) event.currentTarget.setAttribute('data-keyboard-pressed', 'true');
    },
    onKeyUp: (event: WebKeyboardEvent) => {
      const mode = activationMode(event);
      if (!mode) return;
      const wasPressed = event.currentTarget.getAttribute('data-keyboard-pressed') === 'true';
      event.currentTarget.removeAttribute('data-keyboard-pressed');
      if (mode === 'fallback' && wasPressed) {
        event.preventDefault?.();
        event.stopPropagation?.();
        onActivate();
      }
    },
    onBlur: (event: { currentTarget: HTMLElement }) => {
      event.currentTarget.removeAttribute('data-keyboard-pressed');
    },
  } as unknown as PressableProps;
}
