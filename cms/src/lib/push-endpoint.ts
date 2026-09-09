import { ECDH } from 'node:crypto';

export function isAllowedPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash || endpoint.length > 4096) return false;
    return url.hostname === 'fcm.googleapis.com' ||
      url.hostname === 'updates.push.services.mozilla.com' ||
      url.hostname.endsWith('.push.apple.com') ||
      url.hostname === 'notify.windows.com' || url.hostname.endsWith('.notify.windows.com') ||
      url.hostname === 'wns.windows.com' || url.hostname.endsWith('.wns.windows.com');
  } catch { return false; }
}

export function isValidPushKey(p256dh: string, auth: string): boolean {
  if (!/^[A-Za-z0-9_-]{87}$/.test(p256dh) || !/^[A-Za-z0-9_-]{22}$/.test(auth)) return false;
  try {
    const publicKey = Buffer.from(p256dh, 'base64url');
    return publicKey.length === 65 && publicKey[0] === 4 && Buffer.from(auth, 'base64url').length === 16 &&
      ECDH.convertKey(publicKey, 'prime256v1', undefined, undefined, 'uncompressed').length === 65;
  } catch { return false; }
}
