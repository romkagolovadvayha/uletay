import { NextRequest, NextResponse } from 'next/server';
import { getClientAppData, saveAppData, validateAppData } from '@/lib/app-data';
import { verifyBearerToken } from '@/lib/auth';
import { corsHeaders, jsonResponse, optionsResponse } from '@/lib/api-response';

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET() {
  try {
    const data = await getClientAppData();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        ...corsHeaders(),
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    });
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
