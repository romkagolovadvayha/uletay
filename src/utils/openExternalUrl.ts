import { Linking, Platform } from 'react-native';

export const EXTERNAL_LINK_REL = 'noopener noreferrer nofollow noindex';

export function openExternalUrl(url: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  void Linking.openURL(url);
}

function isExternalHttpUrl(href: string, pageOrigin: string): boolean {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('/')) {
    return false;
  }
  if (
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('sms:') ||
    trimmed.startsWith('javascript:')
  ) {
    return false;
  }

  try {
    const url = new URL(trimmed, pageOrigin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }
    return url.origin !== pageOrigin;
  } catch {
    return false;
  }
}

/** Ensure every external http(s) anchor has nofollow/noindex (and safe tab-open attrs). */
export function enforceExternalAnchorRel(root: ParentNode = document): void {
  if (typeof document === 'undefined') {
    return;
  }

  const pageOrigin = window.location.origin;
  const required = EXTERNAL_LINK_REL.split(/\s+/);

  root.querySelectorAll('a[href]').forEach((node) => {
    const anchor = node as HTMLAnchorElement;
    const href = anchor.getAttribute('href');
    if (!href || !isExternalHttpUrl(href, pageOrigin)) {
      return;
    }

    const rel = new Set(
      (anchor.getAttribute('rel') || '')
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean),
    );
    for (const token of required) {
      rel.add(token);
    }
    const nextRel = [...rel].join(' ');
    if (anchor.getAttribute('rel') !== nextRel) {
      anchor.setAttribute('rel', nextRel);
    }

    if (!anchor.getAttribute('target')) {
      anchor.setAttribute('target', '_blank');
    }
  });
}
