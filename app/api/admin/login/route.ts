import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { logActivity } from '@/lib/admin';
import { incrementRateLimit } from '@/lib/feedback';

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}

export async function POST(req: NextRequest) {
  let email = '';
  let password = '';
  try {
    const body = (await req.json()) as { email?: unknown; password?: unknown };
    email = typeof body.email === 'string' ? body.email.trim().slice(0, 320) : '';
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });

  try {
    await incrementRateLimit({ voterHash: `admin:${clientIp(req)}`, action: 'admin-login', max: 10, windowMs: 15 * 60 * 1000 });
  } catch {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  }

  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  // Verify the signed-in user is actually an administrator before keeping the session.
  const { data: { user } } = await sb.auth.getUser();
  const { isAdminUser } = await import('@/lib/admin');
  if (!user || !isAdminUser(user)) {
    await sb.auth.signOut();
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }
  await logActivity('admin.login', 'admin', user.id, '');
  return NextResponse.json({ success: true });
}
