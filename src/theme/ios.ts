import { Platform, type TextStyle, type ViewStyle } from 'react-native';
import { colors } from './colors';
import { radius } from './radius';

/** Web-only refinements. Native screens retain their existing visual system. */
export function webStyle<T extends ViewStyle | TextStyle>(style: T): T | Record<string, never> {
  return Platform.OS === 'web' ? style : {};
}

export function webLabel(label: string, nativeLabel = label.toUpperCase()): string {
  return Platform.OS === 'web' ? label : nativeLabel;
}

export const ios = {
  glass: webStyle({
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
    backdropFilter: 'blur(24px) saturate(150%)',
    WebkitBackdropFilter: 'blur(24px) saturate(150%)',
  } as ViewStyle),
  field: webStyle({ minHeight: 48, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border }),
  button: webStyle({ minHeight: 50, borderRadius: radius.pill, paddingHorizontal: 20, paddingVertical: 13 }),
  iconButton: webStyle({ width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceElevated }),
  chip: webStyle({ minHeight: 44, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.pillInactive, borderWidth: 1, borderColor: colors.border }),
  chipLabel: webStyle({ fontSize: 15, lineHeight: 20, letterSpacing: 0, textTransform: 'none' }),
  secondary: webStyle({ fontSize: 15, lineHeight: 21, letterSpacing: 0, textTransform: 'none' }),
  caption: webStyle({ fontSize: 13, lineHeight: 18, letterSpacing: 0, textTransform: 'none' }),
  errorText: webStyle({ color: '#FF9B94' }),
  title: webStyle({ fontSize: 34, lineHeight: 40, letterSpacing: -0.8, textTransform: 'none' }),
  card: webStyle({ borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }),
} as const;
