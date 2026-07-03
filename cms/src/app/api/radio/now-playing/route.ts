import { fetchRadioNowPlaying } from '@/lib/radio-icy';
import { jsonResponse, optionsResponse } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET() {
  try {
    const nowPlaying = await fetchRadioNowPlaying();
    if (!nowPlaying) {
      return jsonResponse({ error: 'Metadata unavailable' }, 502);
    }

    return jsonResponse(nowPlaying);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return jsonResponse({ error: message }, 500);
  }
}
