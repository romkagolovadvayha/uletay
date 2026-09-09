import { NextRequest } from 'next/server';
import { loginWithCredentials } from '@/lib/auth';
import { jsonResponse, optionsResponse } from '@/lib/api-response';
import { RateLimitError, requestSource } from '@/lib/rate-limit';
import { readRequestJson, RequestJsonError } from '@/lib/request-json';

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: NextRequest) {
  try {
    const body = await readRequestJson(request, 4_096);
    if (!body || typeof body !== 'object') return jsonResponse({ error: 'Invalid credentials' }, 400);
    const fields = body as Record<string, unknown>;
    const username = typeof fields.username === 'string' ? fields.username.trim() : '';
    const password = typeof fields.password === 'string' ? fields.password : '';

    if (!username || !password) {
      return jsonResponse({ error: 'Missing credentials' }, 400);
    }

    const token = await loginWithCredentials(username, password, requestSource(request.headers));
    if (!token) {
      return jsonResponse({ error: 'Invalid credentials' }, 401);
    }

    return jsonResponse({ token });
  } catch (error) {
    if (error instanceof RequestJsonError) return jsonResponse({ error: error.message }, error.status);
    if (error instanceof RateLimitError) {
      const response = jsonResponse({ error: error.message }, 429);
      response.headers.set('Retry-After', String(error.retryAfter));
      return response;
    }
    console.error('Login API failed', error);
    return jsonResponse({ error: 'Не удалось выполнить вход' }, 500);
  }
}
