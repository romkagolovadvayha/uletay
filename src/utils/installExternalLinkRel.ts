import { Platform } from 'react-native';
import { enforceExternalAnchorRel } from './openExternalUrl';

/** Ensure external http(s) anchors keep nofollow/noindex after first paint and route changes. */
export function installExternalLinkRel(): () => void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return () => undefined;
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  const run = () => {
    if (timer != null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      enforceExternalAnchorRel(document);
    }, 250);
  };

  run();

  const onNav = () => run();
  window.addEventListener('popstate', onNav);
  window.addEventListener('hashchange', onNav);

  return () => {
    window.removeEventListener('popstate', onNav);
    window.removeEventListener('hashchange', onNav);
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  };
}
