export function isSecureWebContext(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  if (window.isSecureContext) {
    return true;
  }
  const protocol = window.location?.protocol;
  const hostname = window.location?.hostname;
  return protocol === 'https:' || hostname === 'localhost' || hostname === '127.0.0.1';
}

export function hasWebNotificationApi(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function isStandaloneWebApp(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  return Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function isIosWeb(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  const ua = navigator.userAgent;
  const platform = navigator.platform ?? '';
  return /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function needsPwaForWebNotifications(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  if (hasWebNotificationApi()) {
    return false;
  }
  return isIosWeb() && !isStandaloneWebApp();
}
