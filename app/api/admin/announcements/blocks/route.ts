import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { logActivity, requireAdmin } from '@/lib/admin';
import { addBlock, deleteBlock, normalizeBlockType, reorderBlocks, updateBlock } from '@/lib/announcements';

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req); if (denied) return denied;
  try {
    const body = await req.json() as { announcementId?: unknown; type?: unknown; data?: unknown };
    if (typeof body.announcementId !== 'string' || !body.announcementId) throw new Error('announcementId is required');
    const type = normalizeBlockType(body.type);
    const block = await addBlock(body.announcementId, type, body.data && typeof body.data === 'object' ? body.data as Record<string, unknown> : undefined);
    await logActivity(type === 'upload_request' ? 'upload_request.created' : 'block.added', 'announcement', body.announcementId, `${type}:${block.id}`);
    revalidateTag('announcements', 'max');
    return NextResponse.json({ block }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Add block failed' }, { status: 400 }); }
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req); if (denied) return denied;
  try {
    const body = await req.json() as { id?: unknown; data?: unknown; announcementId?: unknown; order?: unknown };
    if (Array.isArray(body.order) && typeof body.announcementId === 'string') {
      await reorderBlocks(body.announcementId, body.order.filter((x): x is string => typeof x === 'string'));
      await logActivity('block.reordered', 'announcement', body.announcementId, body.order.join(','));
      revalidateTag('announcements', 'max'); return NextResponse.json({ success: true });
    }
    if (typeof body.id !== 'string' || !body.data || typeof body.data !== 'object') throw new Error('Invalid block');
    const block = await updateBlock(body.id, body.data as Record<string, unknown>);
    await logActivity(block.type === 'upload_request' ? 'upload_request.updated' : 'block.edited', 'announcement', block.announcementId, block.id);
    revalidateTag('announcements', 'max'); return NextResponse.json({ block });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Update block failed' }, { status: 400 }); }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(req); if (denied) return denied;
  const id = req.nextUrl.searchParams.get('id'); if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  await deleteBlock(id); await logActivity('block.removed', 'block', id, ''); revalidateTag('announcements', 'max');
  return NextResponse.json({ success: true });
}
