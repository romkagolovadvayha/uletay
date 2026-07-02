import { NextRequest } from 'next/server';
import { loginWithCredentials } from '@/lib/auth';
import { jsonResponse, optionsResponse } from '@/lib/api-response';

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = String(body.username ?? '').trim();
    const password = String(body.password ?? '');

    if (!username || !password) {
      return jsonResponse({ error: 'Missing credentials' }, 400);
    }

    const token = await loginWithCredentials(username, password);
    if (!token) {
      return jsonResponse({ error: 'Invalid credentials' }, 401);
    }

    return jsonResponse({ token });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return jsonResponse({ error: message }, 500);
  }
}
