import { NextRequest, NextResponse } from 'next/server';
import { clearAdminCookie, destroyAdminSession } from '@/lib/admin';

export async function POST(req: NextRequest) {
  await destroyAdminSession(req);
  const res = NextResponse.json({ success: true });
  clearAdminCookie(res);
  return res;
}
