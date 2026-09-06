import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { logActivity, requireAdmin } from '@/lib/admin';
import { createAnnouncement, getAnnouncement, listAnnouncements, normalizeAnnouncementStatus, updateAnnouncement } from '@/lib/announcements';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req); if (denied) return denied;
  const id = req.nextUrl.searchParams.get('id');
  if (id) {
    const item = await getAnnouncement(id);
    return item ? NextResponse.json({ item }) : NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
  }
  const q = req.nextUrl.searchParams.get('q') ?? '';
  const raw = req.nextUrl.searchParams.get('status') ?? 'all';
  const status = raw === 'all' ? 'all' : normalizeAnnouncementStatus(raw);
  const page = Math.max(Number(req.nextUrl.searchParams.get('page')) || 1, 1);
  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit')) || 30, 1), 30);
  return NextResponse.json(await listAnnouncements(q, status, page, limit), { headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' } });
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req); if (denied) return denied;
  try {
    const body = await req.json() as { title?: unknown };
    const sb = await import('@/lib/supabase').then((m) => m.supabaseServer());
    const { data: { user } } = await sb.auth.getUser();
    const item = await createAnnouncement(typeof body.title === 'string' ? body.title : '', user?.id ?? null);
    await logActivity('announcement.created', 'announcement', item.id, item.title);
    revalidateTag('announcements', 'max');
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Create failed' }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req); if (denied) return denied;
  try {
    const body = await req.json() as { id?: unknown; title?: unknown; publishAt?: unknown; expiresAt?: unknown; status?: unknown };
    if (typeof body.id !== 'string' || !body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    if (body.status !== undefined) return NextResponse.json({ error: 'Use the publish endpoint to change visibility' }, { status: 400 });
    const item = await updateAnnouncement(body.id, { title: body.title, publishAt: body.publishAt, expiresAt: body.expiresAt });
    await logActivity('announcement.updated', 'announcement', item.id, item.title);
    revalidateTag('announcements', 'max');
    return NextResponse.json({ item });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Update failed' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(req); if (denied) return denied;
  const id = req.nextUrl.searchParams.get('id');
  const force = req.nextUrl.searchParams.get('force') === '1';
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const { count } = await supabaseAdmin().from('announcement_submissions').select('id', { count: 'exact', head: true }).eq('announcement_id', id);
  if ((count ?? 0) > 0 && !force) return NextResponse.json({ error: `Announcement has ${count} submission(s). Confirm deletion.`, needsConfirm: true, submissionCount: count }, { status: 409 });
  const item = await getAnnouncement(id);
  if (!item) return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
  // R2 is the source of truth: remove block assets and any public-submission
  // objects under this announcement. DB rows cascade via foreign keys.
  const { listR2Keys, deleteR2Keys } = await import('@/lib/r2');
  const keys = new Set<string>();
  for (const prefix of [`announcements/${id}/`, `submissions/${id}/`]) {
    for (const obj of await listR2Keys(prefix)) keys.add(obj.key);
  }
  await deleteR2Keys([...keys]);
  const { error } = await supabaseAdmin().from('announcements').delete().eq('id', id); if (error) throw error;
  await logActivity('announcement.deleted', 'announcement', id, item.title);
  revalidateTag('announcements', 'max'); revalidateTag('r2-files', 'max');
  return NextResponse.json({ success: true });
}
