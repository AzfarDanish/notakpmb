import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabaseServer } from '@/lib/supabase';

export type ActivityItem = {
  id: string
  action: string
  entityType: string
  entityId: string
  meta: string
  createdAt: string
};

/** True when the request cookies carry a valid Supabase Auth admin session. */
export async function isAdminRequest(req: NextRequest): Promise<boolean> {
  // The session is read from cookies via supabaseServer(); `req` is kept so
  // every Route Handler calls requireAdmin(req) uniformly.
  void req;
  try {
    const sb = await supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return false;
    return isAdminUser(user);
  } catch {
    return false;
  }
}

export function isAdminUser(user: { app_metadata?: Record<string, unknown>; email?: string | null }): boolean {
  const meta = (user.app_metadata ?? {}) as Record<string, unknown>;
  if (meta.admin === true || meta.role === 'admin' || meta.app_role === 'admin') return true;
  const allow = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allow.length > 0 && user.email && allow.includes(user.email.toLowerCase())) return true;
  return false;
}

export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }
  return null;
}

/** Server-Component guard (uses request cookies via supabaseServer). */
export async function getAdminFromCookies(): Promise<boolean> {
  try {
    const sb = await supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return false;
    return isAdminUser(user);
  } catch {
    return false;
  }
}

export async function listActivity(limit = 50): Promise<ActivityItem[]> {
  try {
    const { data, error } = await supabaseAdmin()
      .from('activity_log')
      .select('id, action, entity_type, entity_id, meta, created_at')
      .order('created_at', { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 100));
    if (error) throw error;
    return ((data ?? []) as { id: string; action: string; entity_type: string; entity_id: string; meta: string; created_at: string }[]).map((r) => ({
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

const MAX_ACTIVITY_ROWS = 50;

export async function logActivity(action: string, entityType: string, entityId = '', meta = '') {
  const id = `act-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;
  try {
    const sb = supabaseAdmin();
    const { error } = await sb.from('activity_log').insert({
      id,
      action: action.slice(0, 80),
      entity_type: entityType.slice(0, 40),
      entity_id: String(entityId).slice(0, 200),
      meta: String(meta).slice(0, 2000),
    });
    if (error) throw error;
    // Keep the log capped: newest 50 stay, oldest fall off automatically.
    try {
      const { data } = await sb
        .from('activity_log')
        .select('id')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(MAX_ACTIVITY_ROWS, MAX_ACTIVITY_ROWS + 200);
      const overflow = (data ?? []) as { id: string }[];
      if (overflow.length > 0) {
        await sb.from('activity_log').delete().in('id', overflow.map((r) => r.id));
      }
    } catch {
      // trim failure must never break the primary mutation
    }
  } catch {
    // Activity logging must never break the primary mutation.
  }
}
