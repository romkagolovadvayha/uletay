import { Platform } from 'react-native';

const STYLE_ID = 'uletay-web-input-zoom-fix';

export function installWebPreventInputZoom(): () => void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return () => {};
  }

  const viewportMeta = document.querySelector('meta[name="viewport"]');
  const previousViewport = viewportMeta?.getAttribute('content') ?? null;

  if (viewportMeta) {
    const content = previousViewport ?? 'width=device-width, initial-scale=1';
    if (!/maximum-scale\s*=/i.test(content)) {
      viewportMeta.setAttribute('content', `${content}, maximum-scale=1`);
    }
  }

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
    if (viewportMeta && previousViewport !== null) {
      viewportMeta.setAttribute('content', previousViewport);
    }
    style?.remove();
  };
}
