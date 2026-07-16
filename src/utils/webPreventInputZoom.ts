import { Platform } from 'react-native';

const STYLE_ID = 'uletay-web-input-zoom-fix';

export function installWebPreventInputZoom(): () => void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return () => {};
  }

  // Keep pinch-zoom enabled for a11y; prevent iOS focus-zoom via 16px inputs instead.
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      input,
      textarea,
      select {
        font-size: 16px !important;
        outline: none !important;
        box-shadow: none !important;
      }

      input:focus,
      textarea:focus,
      select:focus {
        outline: none !important;
        box-shadow: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  return () => {
    style?.remove();
  };
}
