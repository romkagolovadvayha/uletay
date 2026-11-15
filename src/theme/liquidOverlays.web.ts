import { colors } from './colors.web';

/** The regular dark material keeps text legible above moving/colourful content. */
export const LIQUID_OVERLAY_CSS = `
.liquid-dialog, .liquid-map-sheet {
  box-sizing: border-box; color-scheme: dark; color: ${colors.text};
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  background: linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,0) 48%),rgba(38,38,42,.92);
  border: 1px solid rgba(255,255,255,.22); border-radius: 32px;
  box-shadow: inset 0 1px 1px rgba(255,255,255,.18),inset 0 -1px 1px rgba(255,255,255,.06),0 20px 64px rgba(0,0,0,.38);
  -webkit-backdrop-filter: blur(36px) saturate(150%); backdrop-filter: blur(36px) saturate(150%);
  -webkit-tap-highlight-color: transparent;
}
.liquid-dialog { position: fixed; padding: 0; margin: auto; width: min(340px,calc(100vw - 40px)); max-height: calc(100dvh - 32px); overflow: hidden; }
.liquid-dialog[open] { display: flex; flex-direction: column; animation: liquid-appear 260ms cubic-bezier(.2,.8,.2,1) both; }
.liquid-dialog[data-closing="true"] { animation: liquid-disappear 160ms ease-in both; pointer-events:none; }
.liquid-dialog::backdrop { background:rgba(0,0,0,.32); animation:liquid-dim 220ms ease-out both; }
.liquid-dialog[data-closing="true"]::backdrop { animation:liquid-dim 160ms ease-in reverse both; }
.liquid-dialog__body { position:relative; min-height:0; overflow-y:auto; overscroll-behavior:contain; padding:24px; scrollbar-width:thin; scroll-padding-block:8px; }
.liquid-dialog__title { margin:0; color:${colors.text}; font-size:17px; line-height:22px; font-weight:600; letter-spacing:-.3px; text-wrap:balance; }
.liquid-dialog__description { margin:8px 0 0; color:rgba(245,245,247,.78); font-size:15px; line-height:21px; font-weight:400; }
.liquid-dialog[data-variant="alert"] { text-align:left; }
.liquid-dialog[data-variant="alert"] .liquid-dialog__body { padding:24px 22px 22px; }
.liquid-dialog__content { margin-top:20px; }
.liquid-dialog__actions { display:flex; gap:8px; padding:0 16px 16px; flex-shrink:0; }
.liquid-dialog__action { appearance:none; box-sizing:border-box; flex:1; min-width:0; min-height:46px; padding:11px 14px; border:0; border-radius:999px; background:rgba(255,255,255,.095); color:${colors.text}; font:600 17px/22px -apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif; cursor:pointer; transition:background 140ms,opacity 140ms,transform 140ms; }
.liquid-dialog__action[data-tone="primary"] { background:${colors.primary}; color:${colors.primaryText}; }
.liquid-dialog__action[data-tone="destructive"] { color:#FF6961; }
.liquid-dialog__action:disabled { opacity:.4; cursor:default; }
.liquid-dialog__action:active:not(:disabled),.liquid-dialog__close:active { transform:scale(.97); opacity:.7; }
.liquid-dialog button:focus-visible,.liquid-map-sheet button:focus-visible { outline:2px solid #C7C7CC; outline-offset:2px; }
.liquid-dialog__close { display:flex; align-items:center; justify-content:center; flex:0 0 44px; width:44px; height:44px; padding:0; border:0; border-radius:50%; background:rgba(255,255,255,.09); color:rgba(245,245,247,.7); cursor:pointer; transition:background 140ms,transform 140ms; }
.liquid-dialog__close svg { width:18px; height:18px; }
.liquid-dialog__header { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:20px 20px 8px 24px; flex-shrink:0; }
.liquid-dialog__header .liquid-dialog__title { font-size:22px; line-height:28px; }
.liquid-dialog[data-variant="sheet"] { width:min(520px,calc(100vw - 20px)); margin:auto auto max(10px,env(safe-area-inset-bottom)); max-height:calc(100dvh - 24px); border-radius:36px; }
.liquid-dialog[data-variant="sheet"] .liquid-dialog__body { padding:12px 20px 24px; }
.liquid-dialog[data-variant="sheet"] .liquid-dialog__content { margin:0; }
.liquid-dialog[data-variant="popover"] { inset:auto; margin:0; width:min(286px,calc(100vw - 24px)); border-radius:26px; text-align:left; }
.liquid-dialog[data-variant="popover"]::backdrop { background:rgba(0,0,0,.12); }
.liquid-dialog[data-variant="popover"] .liquid-dialog__header { padding:17px 20px 9px; }
.liquid-dialog[data-variant="popover"] .liquid-dialog__title { color:${colors.textSecondary}; font-size:13px; font-weight:500; line-height:18px; letter-spacing:0; }
.liquid-dialog[data-variant="popover"] .liquid-dialog__body { padding:8px; }
.liquid-dialog[data-variant="popover"] .liquid-dialog__content { margin:0; }
.liquid-select { display:flex; flex-direction:column; gap:2px; }
.liquid-select__option { display:flex; flex-shrink:0; align-items:center; gap:12px; width:100%; box-sizing:border-box; min-height:46px; padding:11px 12px; border:0; border-radius:18px; color:${colors.text}; background:transparent; text-align:left; font:400 17px/22px -apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif; cursor:pointer; transition:background 160ms,color 160ms; }
.liquid-select__option[aria-selected="true"] { background:rgba(255,255,255,.085); font-weight:600; }
.liquid-select__check { width:20px; height:20px; flex-shrink:0; margin-left:auto; color:${colors.primary}; }
.liquid-select__option:active { background:rgba(255,255,255,.15); }
.liquid-map-sheet { position:absolute; z-index:30; left:10px; right:10px; bottom:8px; max-width:520px; margin:0 auto; max-height:calc(100% - 132px); display:flex; flex-direction:column; transition:opacity 220ms ease,transform 280ms cubic-bezier(.2,.8,.2,1),visibility 220ms; }
.liquid-map-sheet[data-visible="false"] { visibility:hidden; opacity:0; transform:translateY(20px) scale(.98); pointer-events:none; }
.liquid-map-sheet[data-visible="true"] { visibility:visible; opacity:1; transform:none; }
.liquid-map-sheet:focus { outline:none; }
.liquid-map-sheet__handle { height:20px; min-height:20px; position:relative; }
.liquid-map-sheet__handle:before { content:''; display:block; width:36px; height:5px; margin:8px auto 0; border-radius:999px; background:rgba(255,255,255,.23); }
.liquid-map-sheet__close { position:absolute; top:16px; right:16px; z-index:2; }
.liquid-map-sheet__body { overflow-y:auto; min-height:0; padding:0 20px 20px; overscroll-behavior:contain; scrollbar-width:thin; }
@media (hover:hover) {
 .liquid-dialog__action:hover:not(:disabled) { filter:brightness(1.12); }
 .liquid-dialog__close:hover,.liquid-select__option:hover { background:rgba(255,255,255,.12); }
}
@media (min-width:768px) { .liquid-dialog[data-variant="sheet"] { margin:auto; } }
@media (prefers-reduced-motion:reduce) { .liquid-dialog[open],.liquid-dialog::backdrop,.liquid-dialog[data-closing="true"],.liquid-dialog[data-closing="true"]::backdrop { animation:none; } .liquid-dialog *,.liquid-map-sheet { transition:none; } }
@media (prefers-reduced-transparency:reduce),(prefers-contrast:more) { .liquid-dialog,.liquid-map-sheet { background:#2C2C2E; backdrop-filter:none; -webkit-backdrop-filter:none; border-color:#68686C; } }
@media (forced-colors:active) { .liquid-dialog,.liquid-map-sheet { background:Canvas; color:CanvasText; border:1px solid CanvasText; } .liquid-dialog button { border:1px solid ButtonText; } }
@keyframes liquid-appear { from { opacity:0; transform:translateY(8px) scale(.94); } to { opacity:1; transform:none; } }
@keyframes liquid-disappear { to { opacity:0; transform:translateY(5px) scale(.97); } }
@keyframes liquid-dim { from { opacity:0; } to { opacity:1; } }
`;
