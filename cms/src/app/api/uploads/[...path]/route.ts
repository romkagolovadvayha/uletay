import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/api-response';
import { config } from '@/lib/config';
import { publicImageResponse } from '@/lib/public-images';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return publicImageResponse(config.uploadDir, (await params).path ?? []);
}
