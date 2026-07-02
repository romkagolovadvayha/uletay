import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { corsHeaders } from '@/lib/api-response';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await context.params;
  const safeParts = parts.filter((part) => part && part !== '.' && part !== '..');
  const filePath = path.join(config.uploadDir, ...safeParts);

  if (!filePath.startsWith(config.uploadDir)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const type =
      ext === '.png'
        ? 'image/png'
        : ext === '.webp'
          ? 'image/webp'
          : ext === '.gif'
            ? 'image/gif'
            : 'image/jpeg';

    return new NextResponse(data, {
      headers: {
        ...corsHeaders(),
        'Content-Type': type,
        'Cache-Control': 'public, max-age=604800',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
