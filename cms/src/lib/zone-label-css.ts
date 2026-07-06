export const ZONE_LABEL_FONT_LINK_ID = 'uletay-zone-label-font';

export const ZONE_LABEL_FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600&display=swap';

export function ensureZoneLabelFont() {
  if (typeof document === 'undefined' || document.getElementById(ZONE_LABEL_FONT_LINK_ID)) return;
  const link = document.createElement('link');
  link.id = ZONE_LABEL_FONT_LINK_ID;
  link.rel = 'stylesheet';
  link.href = ZONE_LABEL_FONT_HREF;
  document.head.appendChild(link);
}

export function zoneLabelCssRules(prefix: 'fest' | 'admin'): string {
  const box = `.${prefix}-zone-label-box`;
  const text = `.${prefix}-zone-label-text`;
  return `
    ${box} {
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      transform: translate(-50%, -50%);
      pointer-events: none;
    }
    ${text} {
      font-family: 'Montserrat', 'Segoe UI', system-ui, sans-serif;
      font-weight: 600;
      font-style: normal;
      font-synthesis: none;
      letter-spacing: 0.02em;
      color: #ffffff;
      text-align: center;
      line-height: 1.2;
      max-width: 100%;
      max-height: 100%;
      overflow: hidden;
      word-break: break-word;
      white-space: normal;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
      text-shadow:
        0 0 1px rgba(0, 0, 0, 0.95),
        0 1px 2px rgba(0, 0, 0, 0.8);
    }
  `;
}
