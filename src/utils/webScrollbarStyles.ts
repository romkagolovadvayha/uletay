import { Platform } from 'react-native';
import { colors } from '../theme/colors';

const STYLE_ID = 'uletay-web-scrollbars';

/** Apply the festival scrollbar treatment to every visible web scroll container. */
export function installWebScrollbarStyles(): () => void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return () => {};
  }

  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      * {
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 193, 7, 0.76) rgba(255, 255, 255, 0.06);
      }

      *::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }

      *::-webkit-scrollbar-button {
        display: none;
        width: 0;
        height: 0;
      }

      *::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.06);
        border-radius: 999px;
      }

      *::-webkit-scrollbar-thumb {
        min-width: 32px;
        min-height: 32px;
        border: 2px solid transparent;
        border-radius: 999px;
        background: rgba(255, 193, 7, 0.76);
        background-clip: padding-box;
      }

      *::-webkit-scrollbar-thumb:hover {
        background-color: ${colors.primary};
      }

      *::-webkit-scrollbar-thumb:active {
        background-color: #ffd54a;
      }

      *::-webkit-scrollbar-corner {
        background: ${colors.background};
      }
    `;
    document.head.appendChild(style);
  }

  return () => {
    style?.remove();
  };
}
