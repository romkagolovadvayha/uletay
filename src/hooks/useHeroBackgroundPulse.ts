import { useEffect, useMemo } from 'react';
import { Animated, Easing } from 'react-native';

const ZOOM_MIN = 1;
const ZOOM_MAX = 1.04;
const ZOOM_CYCLE_MS = 28000;

const FLASH_MIN_DELAY_MS = 7000;
const FLASH_MAX_DELAY_MS = 18000;
const FLASH_PEAK_OPACITY = 0.18;
const FLASH_RISE_MS = 90;
const FLASH_FADE_MS = 420;

function randomFlashDelay() {
  return FLASH_MIN_DELAY_MS + Math.random() * (FLASH_MAX_DELAY_MS - FLASH_MIN_DELAY_MS);
}

export function useHeroBackgroundPulse() {
  const scale = useMemo(() => new Animated.Value(ZOOM_MIN), []);
  const flashOpacity = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    let mounted = true;
    let flashTimeout: ReturnType<typeof setTimeout> | undefined;

    const zoomLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: ZOOM_MAX,
          duration: ZOOM_CYCLE_MS / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: ZOOM_MIN,
          duration: ZOOM_CYCLE_MS / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const runFlash = () => {
      if (!mounted) {
        return;
      }

      Animated.sequence([
        Animated.timing(flashOpacity, {
          toValue: FLASH_PEAK_OPACITY,
          duration: FLASH_RISE_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(flashOpacity, {
          toValue: 0,
          duration: FLASH_FADE_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (!finished || !mounted) {
          return;
        }
        flashTimeout = setTimeout(runFlash, randomFlashDelay());
      });
    };

    zoomLoop.start();
    flashTimeout = setTimeout(runFlash, randomFlashDelay());

    return () => {
      mounted = false;
      if (flashTimeout) {
        clearTimeout(flashTimeout);
      }
      zoomLoop.stop();
      scale.stopAnimation();
      flashOpacity.stopAnimation();
    };
  }, [flashOpacity, scale]);

  return { scale, flashOpacity };
}
