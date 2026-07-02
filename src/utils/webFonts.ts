import { Platform } from 'react-native';

const MONTSERRAT_LINK_ID = 'uletay-montserrat';
const MONTSERRAT_HREF =
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap&subset=cyrillic,cyrillic-ext,latin,latin-ext';

export const IONICONS_FONT_URI =
  'https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.1.1/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf';

export function ensureMontserratStylesheet(timeoutMs = 4_000): Promise<void> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return Promise.resolve();
  }

  const existing = document.getElementById(MONTSERRAT_LINK_ID);
  if (existing) {
    return Promise.resolve();
  }

  const loadStylesheet = new Promise<void>((resolve, reject) => {
    const link = document.createElement('link');
    link.id = MONTSERRAT_LINK_ID;
    link.rel = 'stylesheet';
    link.href = MONTSERRAT_HREF;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error('Failed to load Montserrat stylesheet'));
    document.head.appendChild(link);
  });

  const timeout = new Promise<void>((resolve) => {
    setTimeout(resolve, timeoutMs);
  });

  return Promise.race([loadStylesheet, timeout]);
}
