import { Platform } from 'react-native';
import { initialWindowMetrics } from 'react-native-safe-area-context';

/** Fallback when Android 15+ edge-to-edge reports bottom inset as 0. */
const ANDROID_MIN_BOTTOM_INSET = 16;

/**
 * Resolve bottom safe-area inset for Android edge-to-edge, where insets.bottom
 * can incorrectly report 0 and push UI under the system navigation bar.
 */
export function resolveAndroidBottomInset(...candidates: number[]): number {
  const resolved = Math.max(
    ...candidates,
    initialWindowMetrics?.insets.bottom ?? 0,
    0,
  );

  if (Platform.OS === 'android' && resolved === 0) {
    return ANDROID_MIN_BOTTOM_INSET;
  }

  return resolved;
}
