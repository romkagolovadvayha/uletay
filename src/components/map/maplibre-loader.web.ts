import mapLibrePackage from 'maplibre-gl/package.json';
const { version } = mapLibrePackage;

type MapApi = typeof import('maplibre-gl');
declare global { interface Window { __uletayMapLibre?: MapApi } }
let pending: Promise<MapApi> | undefined;
let failedAttempts = 0;

export function loadMapLibre(): Promise<MapApi> {
  if (pending) return pending;
  const base = `/vendor/maplibre/${version}`;
  const cssReady = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById('uletay-maplibre-css') as HTMLLinkElement | null;
    if (existing?.sheet) { resolve(); return; }
    existing?.remove();
    const css = document.createElement('link');
    const fail = () => { clearTimeout(timer); css.remove(); reject(new Error('Не удалось загрузить оформление карты')); };
    const timer = setTimeout(fail, 20_000);
    css.id = 'uletay-maplibre-css'; css.rel = 'stylesheet'; css.href = `${base}/maplibre-gl.css`;
    css.onerror = fail;
    css.onload = () => { clearTimeout(timer); resolve(); };
    document.head.appendChild(css);
  });
  const apiReady = new Promise<MapApi>((resolve, reject) => {
    if (window.__uletayMapLibre) { resolve(window.__uletayMapLibre); return; }
    const script = document.createElement('script');
    // The package version already invalidates the HTTP cache after an upgrade.
    // Only a failed module load needs a fresh URL within this document.
    script.type = 'module';
    script.src = `${base}/entry.mjs${failedAttempts ? `?attempt=${failedAttempts}` : ''}`;
    const fail = () => { clearTimeout(timer); script.remove(); reject(new Error('Не удалось загрузить MapLibre')); };
    const timer = setTimeout(fail, 20_000);
    script.onerror = fail;
    script.onload = () => {
      clearTimeout(timer);
      if (window.__uletayMapLibre) resolve(window.__uletayMapLibre); else fail();
    };
    document.head.appendChild(script);
  });
  pending = Promise.all([cssReady, apiReady]).then(([, api]) => api)
    .catch((error: unknown) => { failedAttempts += 1; pending = undefined; throw error; });
  return pending;
}
