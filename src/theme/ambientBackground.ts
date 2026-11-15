/** Shared by the web canvas and the initial home HTML; no image download or animation. */
export const AMBIENT_BACKGROUND = `
  linear-gradient(180deg,rgba(5,6,8,0) 0%,rgba(5,6,8,.15) 42%,#050608 100%),
  conic-gradient(from 174deg at 104% -8%,
    transparent 0deg,rgba(244,222,169,.012) 8deg,rgba(244,222,169,.075) 23deg,
    rgba(244,222,169,.055) 33deg,rgba(244,222,169,.012) 47deg,transparent 60deg),
  conic-gradient(from 126deg at -4% -8%,
    transparent 0deg,rgba(244,222,169,.012) 13deg,rgba(244,222,169,.055) 27deg,
    rgba(244,222,169,.075) 37deg,rgba(244,222,169,.012) 52deg,transparent 60deg),
  radial-gradient(ellipse 85% 75% at 100% 0%,rgba(203,181,131,.075),transparent 75%),
  radial-gradient(ellipse 85% 75% at 0% 0%,rgba(203,181,131,.075),transparent 75%),
  radial-gradient(ellipse 70% 85% at 0% 100%,rgba(111,132,164,.025),transparent 80%),
  #050608
`;

export const AMBIENT_BACKGROUND_CSS = `
.uletay-ambient-background {
  position:absolute; inset:0; pointer-events:none; overflow:hidden;
  background:${AMBIENT_BACKGROUND};
}
@media (prefers-reduced-transparency:reduce),(prefers-contrast:more) {
  .uletay-ambient-background,#seo-fallback.app-download { background:#050608; }
}
@media (forced-colors:active) {
  .uletay-ambient-background,#seo-fallback.app-download { background:Canvas; }
}
`;
