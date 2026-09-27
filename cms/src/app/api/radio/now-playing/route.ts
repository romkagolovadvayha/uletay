import { getRadioSnapshot } from '@/lib/radio-liscase';
import { jsonResponse, optionsResponse } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET() {
  try {
    const response = jsonResponse(await getRadioSnapshot());
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch {
    const response = jsonResponse({ error: 'Не удалось обновить информацию об эфире' }, 502);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
}
