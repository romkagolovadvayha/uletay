import { useWindowDimensions } from 'react-native';

/**
 * Shortest side >= 768: real tablets / unfolded foldables.
 * Uses min(width, height) so landscape phones (wide but short) stay mobile —
 * width alone often exceeds 768 in landscape.
 * 600 (Android sw600dp) is too low: large phones with "Small" display size
 * report a shortest side around 600+ and incorrectly get the sidebar layout.
 */
export const TABLET_BREAKPOINT = 768;

export function useIsTablet(): boolean {
  const { width, height } = useWindowDimensions();
  return Math.min(width, height) >= TABLET_BREAKPOINT;
}
