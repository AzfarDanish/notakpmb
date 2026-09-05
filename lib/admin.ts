import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { queryD1 } from '@/lib/d1';

export const ADMIN_COOKIE = 'notakpmb_admin';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function getSecret(): string | null {
  return process.env.ADMIN_SESSION_SECRET ?? process.env.FEEDBACK_COOKIE_SALT ?? process.env.D1_DATABASE_ID ?? null;
}

function signToken(token: string): string {
  const secret = getSecret() ?? 'notakpmb-admin-dev';
  return createHash('sha256').update(`${secret}:${token}`).digest('hex');
}

export function verifyPassword(input: string): boolean {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  const plain = process.env.ADMIN_PASSWORD;
  if (hash && hash.includes(':')) {
    try {
      const [salt, expected] = hash.split(':');
      const derived = scryptSync(input, salt, 64).toString('hex');
      const a = Buffer.from(derived, 'hex');
      const b = Buffer.from(expected, 'hex');
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
  if (plain) {
    const a = Buffer.from(input);
    const b = Buffer.from(plain);
    if (a.length !== b.length) return false;
    try {
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
  return false;
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD);
}

export async function createAdminSession(): Promise<{ token: string; expiresAt: number }> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  await queryD1(
    `INSERT INTO admin_sessions (token, expires_at) VALUES (?, ?)`,
    [token, expiresAt],
  ).catch(() => {
    // Table may not exist yet (pre-migration); session still works via signed cookie fallback below.
  });
  return { token, expiresAt };
}

export function setAdminCookie(res: NextResponse, token: string, expiresAt: number) {
  const sig = signToken(token);
  res.cookies.set(ADMIN_COOKIE, `${token}.${sig}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.max(1, Math.floor((expiresAt - Date.now()) / 1000)),
  });
}

export function clearAdminCookie(res: NextResponse) {
  res.cookies.set(ADMIN_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

function parseAdminCookie(req: NextRequest): string | null {
  const raw = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!raw || !raw.includes('.')) return null;
  const [token, sig] = raw.split('.');
  if (!token || !sig) return null;
  const expected = signToken(token);
  try {
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return token;
}

export async function isAdminRequest(req: NextRequest): Promise<boolean> {
  const token = parseAdminCookie(req);
  if (!token) return false;
  try {
    const res = await queryD1(`SELECT expires_at FROM admin_sessions WHERE token = ? LIMIT 1`, [token]);
    const row = res.results[0];
    if (!row) {
      // Pre-migration fallback: valid signature is enough (single-owner, short TTL still enforced by cookie maxAge).
      return true;
    }
    return Number(row.expires_at ?? 0) > Date.now();
  } catch {
    // If D1 unavailable, fall back to signature check so configured admin can still log in locally.
    return true;
  }
}

export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }
  return null;
}

export async function destroyAdminSession(req: NextRequest) {
  const token = parseAdminCookie(req);
  if (!token) return;
  try {
    await queryD1(`DELETE FROM admin_sessions WHERE token = ?`, [token]);
  } catch {
    // ignore
  }
}

export async function logActivity(action: string, entityType: string, entityId = '', meta = '') {
  const id = `act-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;
  try {
    await queryD1(
      `INSERT INTO activity_log (id, action, entity_type, entity_id, meta) VALUES (?, ?, ?, ?, ?)`,
      [id, action.slice(0, 80), entityType.slice(0, 40), String(entityId).slice(0, 200), String(meta).slice(0, 2000)],
    );
  } catch {
    // activity table may not exist pre-migration; never break the primary mutation.
  }
}

export type ActivityItem = {
  id: string
  action: string
  entityType: string
  entityId: string
  meta: string
  createdAt: string
};

export async function getAdminFromCookies(): Promise<boolean> {
  try {
    const { cookies } = await import('next/headers');
    const store = await cookies();
    const raw = store.get(ADMIN_COOKIE)?.value;
    if (!raw || !raw.includes('.')) return false;
    const [token, sig] = raw.split('.');
    if (!token || !sig) return false;
    const expected = signToken(token);
    try {
      const a = Buffer.from(sig, 'hex');
      const b = Buffer.from(expected, 'hex');
      if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
    } catch {
      return false;
    }
    try {
      const res = await queryD1(`SELECT expires_at FROM admin_sessions WHERE token = ? LIMIT 1`, [token]);
      const row = res.results[0];
      if (!row) return true; // pre-migration fallback
      return Number(row.expires_at ?? 0) > Date.now();
    } catch {
      return true;
    }
  } catch {
    return false;
  }
}

export async function listActivity(limit = 50): Promise<ActivityItem[]> {
  try {
    const res = await queryD1(
      `SELECT id, action, entity_type, entity_id, meta, created_at FROM activity_log ORDER BY created_at DESC LIMIT ?`,
      [Math.min(Math.max(limit, 1), 100)],
    );
    return res.results.map((r) => ({
      id: String(r.id ?? ''),
      action: String(r.action ?? ''),
      entityType: String(r.entity_type ?? ''),
      entityId: String(r.entity_id ?? ''),
      meta: String(r.meta ?? ''),
      createdAt: String(r.created_at ?? ''),
    }));
  } catch {
    return [];
  }
}
