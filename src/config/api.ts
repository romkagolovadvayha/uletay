import { Platform } from 'react-native';
import { AppData, Stage, StageId } from '../types';

const DEFAULT_COLORS: Record<StageId, string> = {
  south: '#F5C518',
  west: '#34C759',
  'ren-tv': '#FF5520',
};

const EXPO_DEV_PORTS = new Set(['8081', '8082', '19006', '19000']);

function getWebApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:3000/api';
  }

  const { origin, port } = window.location;
  if (EXPO_DEV_PORTS.has(port)) {
    return 'http://localhost:3000/api';
  }

  return `${origin}/api`;
}

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'web' && typeof window !== 'undefined'
    ? getWebApiBaseUrl()
    : 'http://localhost:3000/api');

export const CACHE_TTL_MS = 60_000;

export function resolveMediaUrl(path?: string | null): string | undefined {
  if (!path) {
    return undefined;
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  if (path.startsWith('/api/')) {
    const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
    return `${apiOrigin}${path}`;
  }
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (path.startsWith('/')) {
      return `${origin}${path}`;
    }
    return `${origin}/${path}`;
  }
  return `http://localhost${path.startsWith('/') ? path : `/${path}`}`;
}

export function getStageColor(stageId: StageId, stages?: Stage[]): string {
  const fromData = stages?.find((stage) => stage.id === stageId)?.color;
  return fromData ?? DEFAULT_COLORS[stageId] ?? DEFAULT_COLORS.south;
}

export type CachedAppData = {
  data: AppData;
  fetchedAt: number;
};
