import { Platform, useWindowDimensions } from 'react-native';

export const DESKTOP_WEB_BREAKPOINT = 1180;

/** Wide browser layout. Native tablets keep their own adaptive shell. */
export function useIsDesktopWeb(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= DESKTOP_WEB_BREAKPOINT;
}
