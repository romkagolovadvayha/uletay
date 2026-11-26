import React, { useEffect, useState } from 'react';
import { APP_STORES } from '../constants/appDownload';
import { useInstalledAppMode } from '../hooks/useInstalledAppMode.web';
import { colors } from '../theme/colors';
import { FestivalIcon } from './FestivalIcon.web';

const DISMISSED_KEY = 'uletay:app-download-banner-dismissed';

function getDeviceStore() {
  if (typeof navigator === 'undefined') return undefined;

  const { userAgent, platform, maxTouchPoints } = navigator;
  const isAppleMobile = /iPhone|iPad|iPod/i.test(userAgent)
    || (platform === 'MacIntel' && maxTouchPoints > 1);
  const storeName = isAppleMobile ? 'App Store' : /Android/i.test(userAgent) ? 'Google Play' : undefined;
  return APP_STORES.find(store => store.name === storeName);
}

function readDismissed() {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

const BANNER_CSS = `
.app-download-banner {
  box-sizing: border-box;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: calc(8px + env(safe-area-inset-top, 0px)) max(12px, env(safe-area-inset-right, 0px)) 8px max(4px, env(safe-area-inset-left, 0px));
  border-bottom: 1px solid ${colors.borderStrong};
  background: ${colors.festivalBackground};
  color: ${colors.text};
  font-family: FestivalSans, system-ui, sans-serif;
}
.app-download-banner__close {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: ${colors.textSecondary};
  cursor: pointer;
}
.app-download-banner__link {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  min-height: 64px;
  gap: 12px;
  border-radius: 8px;
  color: inherit;
  text-decoration: none;
}
.app-download-banner__logo { display: block; flex: 0 0 36px; width: 36px; height: 36px; object-fit: contain; }
.app-download-banner__copy { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 3px; }
.app-download-banner__title { font-size: 13px; font-weight: 700; line-height: 1.4; }
.app-download-banner__description { color: ${colors.textSecondary}; font-size: 11px; line-height: 1.4; }
.app-download-banner__store { color: ${colors.primary}; font-size: 11px; font-weight: 600; line-height: 1.4; }
.app-download-banner :is(a, button):focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
.app-download-banner__close:active { background: ${colors.borderStrong}; }
@media (hover: hover) {
  .app-download-banner__close:hover { background: ${colors.border}; color: ${colors.text}; }
  .app-download-banner__link:hover .app-download-banner__store { text-decoration: underline; }
}
`;

export function AppDownloadBanner() {
  const installed = useInstalledAppMode();
  const [dismissed, setDismissed] = useState(readDismissed);
  const [store] = useState(getDeviceStore);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === DISMISSED_KEY && event.newValue === '1') setDismissed(true);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (installed || dismissed || !store) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Closing still works when the browser blocks persistent storage.
    }
  };

  return (
    <aside className="app-download-banner" aria-label="Приложение Улетай">
      <style>{BANNER_CSS}</style>
      <button
        type="button"
        className="app-download-banner__close"
        aria-label="Закрыть предложение скачать приложение"
        title="Больше не показывать"
        onClick={dismiss}
      >
        <FestivalIcon name="close" size={18} />
      </button>
      <a
        className="app-download-banner__link"
        href={store.href}
        aria-label={`Скачать приложение Улетай в ${store.name}`}
      >
        <img className="app-download-banner__logo" src={store.image} width={36} height={36} alt="" />
        <span className="app-download-banner__copy">
          <strong className="app-download-banner__title">Скачать приложение на телефон</strong>
          <span className="app-download-banner__description">Чтобы всегда быть в курсе событий</span>
          <span className="app-download-banner__store">{store.name} ↗</span>
        </span>
      </a>
    </aside>
  );
}
