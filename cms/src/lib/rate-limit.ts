import { createHash } from 'node:crypto';

type Window = { count: number; expiresAt: number };
// One shared store for API routes and Server Actions in this CMS process.
const globalState = globalThis as typeof globalThis & { uletayRateLimits?: Map<string, Window> };
const windows = globalState.uletayRateLimits ??= new Map<string, Window>();
const MAX_WINDOWS = 10_000;

export class RateLimitError extends Error {
  constructor(public readonly retryAfter: number) { super('Слишком много запросов. Повторите позже.'); }
}

export function consumeRateLimit(scope: string, key: string, limit: number, periodMs: number, now = Date.now()): void {
  const digest = createHash('sha256').update(`${scope}:${key}`).digest('hex');
  const current = windows.get(digest);
  if (current && current.expiresAt > now) {
    if (current.count >= limit) throw new RateLimitError(Math.max(1, Math.ceil((current.expiresAt - now) / 1000)));
    current.count++;
    return;
  }
  if (windows.size >= MAX_WINDOWS) {
    for (const [id, value] of windows) if (value.expiresAt <= now) windows.delete(id);
    if (windows.size >= MAX_WINDOWS) throw new RateLimitError(60);
  }
  windows.set(digest, { count: 1, expiresAt: now + periodMs });
}

export function requestSource(headers: Pick<Headers, 'get'>): string {
  // Enable only behind our nginx, which overwrites X-Real-IP; never trust arbitrary X-Forwarded-For.
  return process.env.TRUST_PROXY === '1' ? (headers.get('x-real-ip') ?? 'unknown').slice(0, 64) : 'direct';
}
