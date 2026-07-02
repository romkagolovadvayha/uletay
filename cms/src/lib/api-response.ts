import { NextResponse } from 'next/server';
import { config } from '@/lib/config';

export function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': config.corsOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export function jsonResponse(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: corsHeaders() });
}

export function optionsResponse(): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
