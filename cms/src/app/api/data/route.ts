import { NextRequest } from 'next/server';
import { getAppData, saveAppData, validateAppData } from '@/lib/app-data';
import { verifyBearerToken } from '@/lib/auth';
import { jsonResponse, optionsResponse } from '@/lib/api-response';

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET() {
  try {
    const data = await getAppData();
    return jsonResponse(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return jsonResponse({ error: message }, 500);
  }
}

export async function PUT(request: NextRequest) {
  const authorized = await verifyBearerToken(request.headers.get('authorization'));
  if (!authorized) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  try {
    const body = await request.json();
    if (!validateAppData(body)) {
      return jsonResponse({ error: 'Invalid payload' }, 400);
    }
    await saveAppData(body);
    return jsonResponse({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return jsonResponse({ error: message }, 500);
  }
}
