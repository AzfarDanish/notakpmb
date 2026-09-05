import { NextRequest, NextResponse } from 'next/server';
import { createAdminSession, isAdminConfigured, logActivity, setAdminCookie, verifyPassword } from '@/lib/admin';
import { incrementRateLimit } from '@/lib/feedback';

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}

export async function POST(req: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: 'Admin not configured. Set ADMIN_PASSWORD_HASH or ADMIN_PASSWORD.' }, { status: 503 });
  }
  let password = '';
  try {
    const body = (await req.json()) as { password?: unknown };
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  if (!password) return NextResponse.json({ error: 'Password required' }, { status: 400 });

  try {
    await incrementRateLimit({ voterHash: `admin:${clientIp(req)}`, action: 'admin-login', max: 10, windowMs: 15 * 60 * 1000 });
  } catch {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  }

  if (!verifyPassword(password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }
  const { token, expiresAt } = await createAdminSession();
  await logActivity('admin.login', 'admin', '', '');
  const res = NextResponse.json({ success: true });
  setAdminCookie(res, token, expiresAt);
  return res;
}
