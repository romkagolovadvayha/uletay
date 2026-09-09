import { NextResponse } from 'next/server';
import { getClientAppData } from '@/lib/app-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await getClientAppData();
    return NextResponse.json({ ok: true, release: process.env.RELEASE_SHA ?? 'local' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
