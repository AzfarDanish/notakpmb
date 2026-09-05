import { NextRequest, NextResponse } from 'next/server';
import { listActivity, requireAdmin } from '@/lib/admin';

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit') ?? 50) || 50, 1), 100);
  const items = await listActivity(limit);
  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' } });
}
