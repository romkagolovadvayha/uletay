import { Platform } from 'react-native';
import { AppData, Stage, StageId } from '../types';

const DEFAULT_COLORS: Record<StageId, string> = {
  south: '#F5C518',
  west: '#34C759',
  'ren-tv': '#FF5520',
};

const EXPO_DEV_PORTS = new Set(['8081', '8082', '19006', '19000']);
const PRODUCTION_API_BASE_URL = 'https://uletayapp.ru/api';

function isLoopbackUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}

function isLocalWebHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function getWebApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return __DEV__ ? 'http://localhost:3000/api' : PRODUCTION_API_BASE_URL;
  }

  const { hostname, origin, port } = window.location;
  const configured = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  const localPage = isLocalWebHost(hostname);

  // .env.local is intentionally used for local development, but Expo also reads
  // it during a local production export. Never ship that loopback URL to visitors.
  if (configured && (!isLoopbackUrl(configured) || localPage)) {
    return configured;
  }

  if (EXPO_DEV_PORTS.has(port)) {
    return 'http://localhost:3000/api';
  }

  return localPage ? `${origin}/api` : PRODUCTION_API_BASE_URL;
}

function getNativeApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  if (configured && (__DEV__ || !isLoopbackUrl(configured))) {
    return configured;
  }
  return __DEV__ ? 'http://localhost:3000/api' : PRODUCTION_API_BASE_URL;
}

export const API_BASE_URL =
  Platform.OS === 'web' ? getWebApiBaseUrl() : getNativeApiBaseUrl();

export const APP_DATA_REFRESH_INTERVAL_MS = 3 * 60 * 1000;
export const APP_DATA_RETRY_INTERVAL_MS = 30_000;

function getSiteOrigin(): string {
  return API_BASE_URL.replace(/\/api\/?$/, '') || 'https://uletayapp.ru';
}

export function resolveMediaUrl(path?: string | null): string | undefined {
  if (!path) {
    return undefined;
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  if (path.startsWith('/api/')) {
    return `${getSiteOrigin()}${path}`;
  }

  const origin =
    Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : getSiteOrigin();

  if (path.startsWith('/')) {
    return `${origin}${path}`;
  }
  return `${origin}/${path}`;
}

export function getStageColor(stageId: StageId, stages?: Stage[]): string {
  const fromData = stages?.find((stage) => stage.id === stageId)?.color;
  return fromData ?? DEFAULT_COLORS[stageId] ?? DEFAULT_COLORS.south;
}

export type CachedAppData = {
  data: AppData;
  fetchedAt: number;
};
