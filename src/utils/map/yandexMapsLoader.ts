import { YANDEX_MAPS_SCRIPT_URL } from '../../config/yandexMaps';

let loadPromise: Promise<YandexMapsModule> | null = null;

const YANDEX_REFERER_HINT =
  'Добавьте localhost в поле «Ограничение по HTTP Referer» ключа в кабинете developer.tech.yandex.ru (JS API 3.0 требует это поле).';

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (window.ymaps3) {
        resolve();
        return;
      }
      existing.remove();
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.type = 'text/javascript';
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      reject(
        new Error(
          `Не удалось загрузить Yandex Maps API. Проверьте подключение к api-maps.yandex.ru. Если сеть доступна, ${YANDEX_REFERER_HINT}`,
        ),
      );
    };
    document.head.appendChild(script);
  });
}

export type YandexMapsBundle = {
  ymaps3: YandexMapsModule;
  YMapImageOverlay: new (props: Record<string, unknown>) => YandexMapEntity;
};

export async function loadYandexMaps(): Promise<YandexMapsBundle> {
  if (!YANDEX_MAPS_SCRIPT_URL) {
    throw new Error('EXPO_PUBLIC_YANDEX_MAPS_API_KEY не задан');
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      await loadScript(YANDEX_MAPS_SCRIPT_URL);
      const ymaps3 = window.ymaps3;
      if (!ymaps3) {
        throw new Error('Yandex Maps API не инициализировался');
      }

      // Как в common.ts официального примера image-overlay — до ymaps3.ready
      ymaps3.import.registerCdn('https://cdn.jsdelivr.net/npm/{package}', [
        '@yandex/ymaps3-default-ui-theme@0.0',
      ]);

      await ymaps3.ready;

      return ymaps3;
    })().catch((error) => {
      loadPromise = null;
      throw error;
    });
  }

  const ymaps3 = await loadPromise;
  const themeModule = await ymaps3.import('@yandex/ymaps3-default-ui-theme');
  const YMapImageOverlay = themeModule.YMapImageOverlay as new (
    props: Record<string, unknown>,
  ) => YandexMapEntity;

  return { ymaps3, YMapImageOverlay };
}
