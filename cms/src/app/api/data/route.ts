import { NextRequest, NextResponse } from 'next/server';
import { AppDataConflictError, AppDataValidationError, getAppDataRevision, getClientAppData, saveAppData, validateAppData } from '@/lib/app-data';
import { verifyBearerToken } from '@/lib/auth';
import { corsHeaders, jsonResponse, optionsResponse } from '@/lib/api-response';
import { readRequestJson, RequestJsonError } from '@/lib/request-json';

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest) {
  try {
    const etag = `"${await getAppDataRevision()}"`;
    if (request.headers.get('if-none-match') === etag) {
      return new NextResponse(null, { status: 304, headers: { ...corsHeaders(), ETag: etag, 'Cache-Control': 'no-cache' } });
    }
    const data = await getClientAppData();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        ...corsHeaders(),
        ETag: `"${data.revision}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('GET /api/data failed', error);
    return jsonResponse({ error: 'Не удалось загрузить данные' }, 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authorized = await verifyBearerToken(request.headers.get('authorization'));
    if (!authorized) return jsonResponse({ error: 'Unauthorized' }, 401);
    const body = await readRequestJson(request, 16 * 1024 * 1024);
    if (!validateAppData(body)) {
      return jsonResponse({ error: 'Invalid payload' }, 400);
    }
    await saveAppData(body);
    return jsonResponse({ ok: true, revision: body.revision });
  } catch (error) {
    if (error instanceof RequestJsonError) return jsonResponse({ error: error.message }, error.status);
    if (error instanceof AppDataConflictError) return jsonResponse({ error: error.message }, 409);
    if (error instanceof AppDataValidationError) return jsonResponse({ error: error.message }, 400);
    console.error('PUT /api/data failed', error);
    return jsonResponse({ error: 'Не удалось сохранить данные' }, 500);
  }
}
