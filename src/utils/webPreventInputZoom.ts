import { Platform } from 'react-native';
import { colors } from '../theme/colors';
import { webUi } from '../theme/web';

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
        font-size: ${webUi.minimumInputFontSize} !important;
      }

      a:focus-visible,
      button:focus-visible,
      input:focus-visible,
      textarea:focus-visible,
      select:focus-visible,
      [role="button"]:focus-visible,
      [role="link"]:focus-visible,
      [role="radio"]:focus-visible,
      [role="tab"]:focus-visible {
        outline: ${webUi.focusOutline} ${colors.primary} !important;
        outline-offset: ${webUi.focusOutlineOffset} !important;
      }
    `;
    document.head.appendChild(style);
  }

  return () => {
    style?.remove();
  };
}
