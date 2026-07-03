import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/api-response';
import { config } from '@/lib/config';

const MIME: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const segments = (await params).path ?? [];
  const safe = segments.filter((part) => part && part !== '.' && part !== '..');
  if (!safe.length) {
    return new NextResponse('Not found', { status: 404, headers: corsHeaders() });
  }

  const filePath = path.join(config.uploadDir, ...safe);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(config.uploadDir))) {
    return new NextResponse('Forbidden', { status: 403, headers: corsHeaders() });
  }

  try {
    const data = await readFile(resolved);
    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME[ext] ?? 'application/octet-stream';
    return new NextResponse(data, {
      status: 200,
      headers: {
        ...corsHeaders(),
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404, headers: corsHeaders() });
  }
}
