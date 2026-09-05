import { NextRequest, NextResponse } from 'next/server';
import { logActivity, requireAdmin } from '@/lib/admin';
import { deleteAdminNote, listAdminNotes, upsertAdminNote } from '@/lib/admin-data';

const ALLOWED = new Set(['feedback', 'file', 'subject', 'programme']);

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const entityType = req.nextUrl.searchParams.get('entityType') ?? '';
  const entityId = req.nextUrl.searchParams.get('entityId') ?? '';
  if (!ALLOWED.has(entityType) || !entityId || entityId.length > 300) {
    return NextResponse.json({ error: 'Invalid target' }, { status: 400 });
  }
  const notes = await listAdminNotes(entityType, entityId);
  return NextResponse.json({ notes }, { headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' } });
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  let payload: { entityType?: unknown; entityId?: unknown; body?: unknown };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (typeof payload.entityType !== 'string' || !ALLOWED.has(payload.entityType)) {
    return NextResponse.json({ error: 'Invalid entityType' }, { status: 400 });
  }
  if (typeof payload.entityId !== 'string' || !payload.entityId || payload.entityId.length > 300) {
    return NextResponse.json({ error: 'Invalid entityId' }, { status: 400 });
  }
  if (typeof payload.body !== 'string' || !payload.body.trim()) {
    return NextResponse.json({ error: 'Note is empty' }, { status: 400 });
  }
  try {
    const note = await upsertAdminNote(payload.entityType, payload.entityId, payload.body);
    await logActivity('note.added', payload.entityType, payload.entityId, '');
    return NextResponse.json({ note }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to save note' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const id = req.nextUrl.searchParams.get('id');
  if (!id || id.length > 200) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  await deleteAdminNote(id);
  await logActivity('note.deleted', 'note', id, '');
  return NextResponse.json({ success: true });
}
