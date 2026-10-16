import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { corsHeaders } from './api-response';

const MIME: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
};

function within(root: string, target: string) {
  const relative = path.relative(root, target);
  return (
    relative !== '' &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

export async function publicImageResponse(root: string, segments: string[]) {
  const missing = () => new NextResponse('Not found', { status: 404, headers: corsHeaders() });
  if (
    !segments.length ||
    segments.some((part) => !part || part === '.' || part === '..' || /[\\/:\0]/.test(part))
  )
    return missing();
  const target = path.resolve(root, ...segments);
  const contentType = MIME[path.extname(target).toLowerCase()];
  if (!contentType || !within(path.resolve(root), target)) return missing();
  try {
    // Resolve symlinks as well as dot segments before exposing a file publicly.
    const [realRoot, realTarget] = await Promise.all([realpath(root), realpath(target)]);
    if (!within(realRoot, realTarget)) return missing();
    return new NextResponse(await readFile(realTarget), {
      headers: {
        ...corsHeaders(),
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return missing();
  }
}
