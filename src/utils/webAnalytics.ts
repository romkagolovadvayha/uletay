const YANDEX_METRIKA_ID = 111346786;

let previousUrl: string | null = null;

type AnalyticsWindow = Window & {
  gtag?: (...args: unknown[]) => void;
  ym?: (...args: unknown[]) => void;
};

export function trackWebPageView() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const url = window.location.href;
  if (url === previousUrl) {
    return;
  }

  const referer = previousUrl ?? document.referrer;
  const analytics = window as AnalyticsWindow;
  analytics.gtag?.('event', 'page_view', {
    page_title: document.title,
    page_location: url,
    page_referrer: referer,
  });
  analytics.ym?.(YANDEX_METRIKA_ID, 'hit', url, {
    title: document.title,
    referer,
  });
  previousUrl = url;
}
