import { Platform } from 'react-native';
import { AppData, Stage, StageId } from '../types';
import { isLoopbackUrl, resolveWebApiBaseUrl } from './web-api-base-url';

const DEFAULT_COLORS: Record<StageId, string> = {
  south: '#F5C518',
  west: '#34C759',
  'ren-tv': '#FF5520',
};

const PRODUCTION_API_BASE_URL = 'https://uletayapp.ru/api';

function getWebApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return __DEV__ ? 'http://localhost:3000/api' : PRODUCTION_API_BASE_URL;
  }

  const { hostname, origin, port } = window.location;
  const configured = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

  return resolveWebApiBaseUrl({
    hostname,
    origin,
    port,
    configured,
    productionBaseUrl: PRODUCTION_API_BASE_URL,
  });
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
