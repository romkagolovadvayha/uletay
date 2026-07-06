export const YANDEX_MAPS_API_KEY = process.env.EXPO_PUBLIC_YANDEX_MAPS_API_KEY ?? '';

export const YANDEX_MAPS_SCRIPT_URL = YANDEX_MAPS_API_KEY
  ? `https://api-maps.yandex.ru/v3/?apikey=${encodeURIComponent(YANDEX_MAPS_API_KEY)}&lang=ru_RU`
  : '';
