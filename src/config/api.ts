import { Platform } from 'react-native';
import { AppData, Stage, StageId } from '../types';
import { stageColors } from '../theme/palettes';
import { isIsolatedPreviewUrl, isLoopbackUrl, resolveWebApiBaseUrl } from './web-api-base-url';

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

/** Local development stays isolated from public gateways and production writes. */
export const API_FALLBACK_URLS = isIsolatedPreviewUrl(API_BASE_URL) ? [] :
  String(process.env.EXPO_PUBLIC_API_FALLBACK_URLS ?? 'https://d5doi78tpg13bke63gsc.bu9mdbe1.apigw.yandexcloud.net/api').split(',').map((value:string)=>value.trim().replace(/\/$/,'')).filter((value:string)=>{
    try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&url.pathname==='/api'&&!url.search&&!url.hash;}catch{return false;}
  });

// Conditional requests transfer the catalog only when its revision changes.
export const APP_DATA_REFRESH_INTERVAL_MS = 30_000;

export function getSiteOrigin(): string {
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
  return fromData ?? stageColors[stageId] ?? stageColors.south;
}

export type CachedAppData = {
  data: AppData;
  fetchedAt: number;
};
