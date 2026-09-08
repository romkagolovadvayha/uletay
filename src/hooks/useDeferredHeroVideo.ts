import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

type NetworkInformationWithSaveData = {
  effectiveType?: string;
  saveData?: boolean;
  addEventListener?: (type: 'change', listener: () => void) => void;
  removeEventListener?: (type: 'change', listener: () => void) => void;
};

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformationWithSaveData;
  mozConnection?: NetworkInformationWithSaveData;
  webkitConnection?: NetworkInformationWithSaveData;
};

function getNetworkInformation(): NetworkInformationWithSaveData | undefined {
  if (typeof navigator === 'undefined') {
    return undefined;
  }

  const browserNavigator = navigator as NavigatorWithConnection;
  return (
    browserNavigator.connection ??
    browserNavigator.mozConnection ??
    browserNavigator.webkitConnection
  );
}

function shouldAvoidWebVideo(
  reducedMotionQuery: MediaQueryList,
  connection: NetworkInformationWithSaveData | undefined,
): boolean {
  const effectiveType = connection?.effectiveType?.toLowerCase();
  return (
    reducedMotionQuery.matches ||
    connection?.saveData === true ||
    effectiveType === 'slow-2g' ||
    effectiveType === '2g'
  );
}

/**
 * Keep the poster as the web LCP element, then mount the video after hydration.
 * Native apps keep the static poster and never mount the video player.
 */
export function useDeferredHeroVideo(): boolean {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = getNetworkInformation();

    const syncPolicy = () => {
      setAllowed(!shouldAvoidWebVideo(reducedMotionQuery, connection));
    };

    reducedMotionQuery.addEventListener('change', syncPolicy);
    connection?.addEventListener?.('change', syncPolicy);
    syncPolicy();

    return () => {
      reducedMotionQuery.removeEventListener('change', syncPolicy);
      connection?.removeEventListener?.('change', syncPolicy);
    };
  }, []);

  return allowed;
}
