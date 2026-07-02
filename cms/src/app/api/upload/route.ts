import { NextRequest } from 'next/server';
import { verifyBearerToken } from '@/lib/auth';
import type { ImagePreset } from '@/lib/image-presets';
import { ImageUploadError, saveUploadedImage } from '@/lib/upload';
import { jsonResponse, optionsResponse } from '@/lib/api-response';
import { getSession } from '@/lib/session';

async function isAuthorized(request: NextRequest): Promise<boolean> {
  if (await verifyBearerToken(request.headers.get('authorization'))) {
    return true;
  }
  const session = await getSession();
  return Boolean(session.adminUserId);
}

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  try {
    const form = await request.formData();
    const file = form.get('file');
    const subdir = String(form.get('subdir') ?? 'images');
    const preset = String(form.get('preset') ?? 'artist') as ImagePreset;

    if (!(file instanceof File)) {
      return jsonResponse({ error: 'File is required' }, 400);
    }

    const url = await saveUploadedImage(file, subdir, preset);
    return jsonResponse({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    const status = error instanceof ImageUploadError ? 400 : 500;
    return jsonResponse({ error: message }, status);
  }
}
