import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

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
 * Keep the poster as the web LCP element. The video is mounted only after the
 * first user interaction, which closes the browser's LCP observation window.
 */
export function useDeferredHeroVideo(): boolean {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      let active = true;
      void AccessibilityInfo.isReduceMotionEnabled().then((reducedMotion) => {
        if (active) {
          setAllowed(!reducedMotion);
        }
      });

      const subscription = AccessibilityInfo.addEventListener(
        'reduceMotionChanged',
        (reducedMotion) => setAllowed(!reducedMotion),
      );

      return () => {
        active = false;
        subscription.remove();
      };
    }

    if (typeof window === 'undefined') {
      return;
    }

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = getNetworkInformation();
    let userInteracted = false;

    const syncPolicy = () => {
      setAllowed(userInteracted && !shouldAvoidWebVideo(reducedMotionQuery, connection));
    };
    const onInteraction = () => {
      userInteracted = true;
      syncPolicy();
    };

    const interactionEvents: (keyof WindowEventMap)[] = [
      'pointerdown',
      'touchstart',
      'keydown',
      'scroll',
    ];
    interactionEvents.forEach((eventName) => {
      window.addEventListener(eventName, onInteraction, { passive: true });
    });
    reducedMotionQuery.addEventListener('change', syncPolicy);
    connection?.addEventListener?.('change', syncPolicy);
    syncPolicy();

    return () => {
      interactionEvents.forEach((eventName) => {
        window.removeEventListener(eventName, onInteraction);
      });
      reducedMotionQuery.removeEventListener('change', syncPolicy);
      connection?.removeEventListener?.('change', syncPolicy);
    };
  }, []);

  return allowed;
}
