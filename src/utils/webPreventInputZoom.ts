import { Platform } from 'react-native';
import { colors } from '../theme/colors';
import { webUi } from '../theme/web';
import { WEB_CONTROL_CSS } from '../theme/interactions.web';

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
      :root { color-scheme: dark; }
      ${WEB_CONTROL_CSS}
      input::selection, textarea::selection { background: ${colors.primarySubtle}; }
      input,
      textarea,
      select {
        font-size: ${webUi.minimumInputFontSize} !important;
      }

      :is(a[href], button, [role="button"], [role="link"], [role="radio"],
          [role="tab"], [role="checkbox"], [role="switch"], [role="menuitem"]):not(:disabled):not([aria-disabled="true"]):focus-visible {
        outline: ${webUi.focusOutline} ${webUi.controlFocusColor} !important;
        outline-offset: ${webUi.focusOutlineOffset} !important;
      }
      [data-uletay-control="navigation"]:not(:disabled):not([aria-disabled="true"]):focus-visible {
        outline-offset: -3px !important;
      }

      input:focus-visible,
      textarea:focus-visible,
      select:focus-visible {
        outline: ${webUi.focusOutline} ${webUi.inputFocusBorder} !important;
        outline-offset: ${webUi.focusOutlineOffset} !important;
      }

      /* Highlight the whole search capsule, including its icon and clear button. */
      #headliner-search-field,
      #map-search-field {
        transition: border-color 150ms ease, background-color 150ms ease;
      }
      @media (hover: hover) and (pointer: fine) {
        #headliner-search-field:hover:not(:focus-within),
        #map-search-field:hover:not(:focus-within) { border-color: ${webUi.inputHoverBorder}; }
      }
      #headliner-search-field:focus-within,
      #map-search-field:focus-within {
        border-color: ${webUi.inputFocusBorder};
        background-color: ${colors.surfaceElevated};
      }
      #headliner-search-field input:focus,
      #map-search-field input:focus {
        outline: none !important;
      }
      @media (prefers-reduced-motion: reduce) {
        #headliner-search-field,
        #map-search-field { transition: none; }
      }
      @media (forced-colors: active) {
        :focus-visible { outline-color: Highlight !important; }
        #headliner-search-field:focus-within,
        #map-search-field:focus-within { border-color: Highlight; }
      }
    `;
    document.head.appendChild(style);
  }

  return () => {
    style?.remove();
  };
}
