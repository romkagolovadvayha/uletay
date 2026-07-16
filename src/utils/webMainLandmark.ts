import { Platform } from 'react-native';

/** Ensure the app root exposes a single main landmark for assistive tech. */
export function installWebMainLandmark(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }

  const root = document.getElementById('root');
  if (!root || root.tagName === 'MAIN' || root.getAttribute('role') === 'main') {
    return;
  }

  root.setAttribute('role', 'main');
}
