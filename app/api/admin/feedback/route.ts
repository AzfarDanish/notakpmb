import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { logActivity, requireAdmin } from '@/lib/admin';
import { countFeedbackAdmin, deleteFeedback, normalizeFeedbackSort, normalizeFeedbackStatus, normalizeStatusFilter, searchFeedbackAdmin, updateFeedbackStatus } from '@/lib/feedback';
import { recordStatusChange } from '@/lib/admin-data';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const q = req.nextUrl.searchParams.get('q') ?? '';
  const sort = normalizeFeedbackSort(req.nextUrl.searchParams.get('sort'));
  const status = normalizeStatusFilter(req.nextUrl.searchParams.get('status'));
  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit')) || 30, 1), 30);
  const page = Math.max(Number(req.nextUrl.searchParams.get('page')) || 1, 1);
  try {
    const [items, total] = await Promise.all([
      searchFeedbackAdmin(q, sort, status, limit, (page - 1) * limit),
      countFeedbackAdmin(q, status),
    ]);
    return NextResponse.json({ items, total, page, limit }, { headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' } });
  } catch (e) {
    console.error('Admin feedback list error:', e);
    return NextResponse.json({ error: 'Failed to load feedback' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  let payload: { id?: unknown; status?: unknown; reason?: unknown };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (typeof payload.id !== 'string' || !payload.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  if (payload.id.length > 200) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  let status;
  try {
    status = normalizeFeedbackStatus(payload.status);
  } catch {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }
  const reason = typeof payload.reason === 'string' ? payload.reason.slice(0, 500) : '';
  try {
    const { data: before } = await supabaseAdmin().from('feedback_items').select('status').eq('id', payload.id).limit(1).maybeSingle();
    const oldStatus = String((before as { status: string } | null)?.status ?? '');
    const item = await updateFeedbackStatus(payload.id, status);
    await recordStatusChange(payload.id, oldStatus, status, reason);
    await logActivity(status === 'archived' ? 'feedback.archived' : 'feedback.status', 'feedback', payload.id, `${oldStatus} -> ${status}${reason ? ` (${reason})` : ''}`);
    revalidateTag('feedback', 'max');
    return NextResponse.json({ item });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to update feedback';
    return NextResponse.json({ error: msg }, { status: msg === 'Feedback not found' ? 404 : 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const id = req.nextUrl.searchParams.get('id');
  if (!id || id.length > 200) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  try {
    await deleteFeedback(id);
    await logActivity('feedback.deleted', 'feedback', id, '');
    revalidateTag('feedback', 'max');
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Admin feedback delete error:', e);
    return NextResponse.json({ error: 'Failed to delete feedback' }, { status: 500 });
  }
}
