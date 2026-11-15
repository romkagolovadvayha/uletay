import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { webUi } from '../theme/web';
import { AMBIENT_BACKGROUND, AMBIENT_BACKGROUND_CSS } from '../theme/ambientBackground';

export const APP_DOWNLOAD_TITLE = 'Приложение Улетай 2027';
export const APP_DOWNLOAD_SUBTITLE = 'Скачать приложение';
export const APP_DOWNLOAD_DESCRIPTION = 'Скачайте приложение Улетай 2027 для Android в Google Play или RuStore.';
export const APP_STORE_UNAVAILABLE = 'Приложение пока недоступно для скачивания. Скоро появится.';

export const APP_STORES = [
  {
    name: 'Google Play',
    href: 'https://play.google.com/store/apps/details?id=ru.uletay.app',
    image: '/store-google-play-icon.png',
  },
  {
    name: 'RuStore',
    href: 'https://www.rustore.ru/catalog/app/ru.uletay.app',
    image: '/store-rustore-icon.svg',
  },
  {
    name: 'App Store',
    href: null,
    image: '/store-app-store-icon.svg',
  },
] as const;

// Shared by the live web screen and its initial, JavaScript-free HTML.
export const APP_DOWNLOAD_CSS = `
.app-download, #seo-fallback.app-download {
  box-sizing: border-box;
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: none;
  height: 100%;
  min-height: 0;
  margin: 0;
  padding: max(24px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left));
  overflow: hidden;
  container-type: size;
  background: transparent;
  color: ${colors.text};
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  text-align: center;
}
#seo-fallback.app-download { height: 100dvh; background: ${AMBIENT_BACKGROUND}; }
${AMBIENT_BACKGROUND_CSS}
.app-download__content { width: 100%; max-width: 760px; }
.app-download h1, #seo-fallback.app-download h1 {
  max-width: 17ch;
  margin: 0 auto;
  font-size: clamp(40px, 6vw, 72px);
  font-weight: 700;
  line-height: 1.12;
  letter-spacing: -0.035em;
  text-wrap: balance;
}
.app-download__countdown { width: min(300px, 100%); margin: 32px auto 0; }
.app-download__subtitle {
  margin: 32px 0 0;
  color: ${colors.textSecondary};
  font-size: 18px;
  line-height: 1.4;
}
.app-download__stores {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}
.app-download__store {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 14px;
  width: min(280px, 100%);
  min-height: 58px;
  padding: 12px 18px;
  border: 1px solid ${colors.border};
  border-radius: ${radius.lg}px;
  background: ${colors.surface};
  color: ${colors.text};
  text-decoration: none;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 150ms ease, border-color 150ms ease, transform 150ms ease;
}
#seo-fallback.app-download .app-download__store { color: ${colors.text}; }
@media (hover: hover) {
  .app-download__store:hover { background: ${colors.surfaceElevated}; border-color: ${colors.borderStrong}; }
}
.app-download__store:active { background: ${colors.surfaceElevated}; transform: scale(.98); }
.app-download__store:focus-visible { outline: ${webUi.focusOutline} ${webUi.controlFocusColor}; outline-offset: 4px; }
.app-download__logo { display: block; width: 32px; height: 32px; flex: 0 0 32px; object-fit: contain; }
.app-download__store-name { flex: 1; font-size: 18px; font-weight: 600; line-height: 1.25; letter-spacing: -.2px; }
.app-download__chevron { width: 8px; height: 8px; flex: 0 0 8px; margin-right: 2px; border-top: 2px solid ${colors.textMuted}; border-right: 2px solid ${colors.textMuted}; transform: rotate(45deg); }
.app-download__availability { position: relative; width: min(280px, 100%); }
.app-download__availability summary { list-style: none; }
.app-download__availability summary::-webkit-details-marker { display: none; }
.app-download__notice { position: absolute; bottom: calc(100% + 8px); margin: 0; padding: 20px; border: 1px solid ${colors.borderStrong}; border-radius: ${radius.lg}px; background: ${colors.surfaceElevated}; color: ${colors.text}; font-size: 16px; line-height: 1.5; }
@container (max-height: 580px) {
  .app-download__countdown { display: none; }
}
@container (max-height: 400px) {
  .app-download h1, #seo-fallback.app-download h1 { max-width: none; font-size: 28px; }
  .app-download__subtitle { margin-top: 24px; font-size: 16px; }
  .app-download__stores { margin-top: 10px; gap: 8px; }
  .app-download__store { min-height: 48px; padding: 7px 16px; }
  .app-download__store-name { font-size: 17px; }
}
@container (max-height: 300px) {
  .app-download h1, #seo-fallback.app-download h1 { font-size: 24px; }
  .app-download__subtitle { margin-top: 16px; font-size: 14px; }
  .app-download__stores { margin-top: 8px; gap: 6px; }
  .app-download__store { min-height: 44px; padding: 7px 16px; }
  .app-download__logo { width: 28px; height: 28px; flex-basis: 28px; }
}
@media (max-height: 500px) {
  .app-download, #seo-fallback.app-download { padding-top: 16px; padding-bottom: 16px; }
}
@media (prefers-reduced-motion: reduce) {
  .app-download__store { transition: none; }
}
`;
