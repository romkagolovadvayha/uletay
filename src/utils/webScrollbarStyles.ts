import { Platform } from 'react-native';
import { colors } from '../theme/colors';
import { webUi } from '../theme/web';

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
        scrollbar-color: ${colors.scrollbarThumb} ${colors.scrollbarTrack};
      }

      *::-webkit-scrollbar {
        width: ${webUi.scrollbarSize};
        height: ${webUi.scrollbarSize};
      }

      *::-webkit-scrollbar-button {
        display: none;
        width: 0;
        height: 0;
      }

      *::-webkit-scrollbar-track {
        background: ${colors.scrollbarTrack};
        border-radius: ${webUi.scrollbarTrackRadius};
      }

      *::-webkit-scrollbar-thumb {
        min-width: ${webUi.scrollbarThumbMinSize};
        min-height: ${webUi.scrollbarThumbMinSize};
        border: ${webUi.scrollbarThumbBorder};
        border-radius: ${webUi.scrollbarThumbRadius};
        background: ${colors.scrollbarThumb};
        background-clip: padding-box;
      }

      *::-webkit-scrollbar-thumb:hover {
        background-color: ${colors.primary};
      }

      *::-webkit-scrollbar-thumb:active {
        background-color: ${colors.scrollbarThumbActive};
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
