import { webUi } from './web';

// A separate overlay preserves each control's fill, selected state and shadow.
const control = '[data-uletay-control]:not(:disabled):not([aria-disabled="true"])';

export const WEB_CONTROL_CSS = `
  [data-uletay-control] { isolation: isolate; -webkit-tap-highlight-color: transparent; }
  [data-uletay-control]::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    z-index: 2;
    background-color: transparent;
    transition: background-color ${webUi.interactionDuration} ease-out;
  }
  ${control} { cursor: pointer; }
  @media (hover: hover) and (pointer: fine) {
    ${control}:hover::after { background-color: ${webUi.controlHoverOverlay}; }
    ${control}:has([data-uletay-control]:hover)::after { background-color: transparent; }
  }
  ${control}:active::after,
  ${control}[data-keyboard-pressed="true"]::after { background-color: ${webUi.controlPressedOverlay}; }
  ${control}:has([data-uletay-control]:active)::after { background-color: transparent; }
  [data-uletay-control]:disabled,
  [data-uletay-control][aria-disabled="true"] { cursor: not-allowed; opacity: 0.45 !important; }
  [data-uletay-control="navigation"] { border-radius: 12px; }
  @media (prefers-reduced-motion: reduce) {
    [data-uletay-control]::after { transition: none; }
  }
  @media (forced-colors: active) {
    ${control}:hover { outline: 1px solid Highlight; outline-offset: -1px; }
    ${control}:active, ${control}[data-keyboard-pressed="true"] { outline: 2px solid Highlight; outline-offset: -2px; }
  }
`;
