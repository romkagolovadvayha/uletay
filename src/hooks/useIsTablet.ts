import { useWindowDimensions } from 'react-native';

/**
 * Matches Android large-screen threshold (sw600dp): foldables/tablets,
 * not landscape phones whose width alone can exceed 768.
 */
export const TABLET_BREAKPOINT = 600;

export function useIsTablet(): boolean {
  const { width, height } = useWindowDimensions();
  return Math.min(width, height) >= TABLET_BREAKPOINT;
}
