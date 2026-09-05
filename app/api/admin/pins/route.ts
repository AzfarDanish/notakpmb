import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { logActivity, requireAdmin } from '@/lib/admin';
import { setPinned } from '@/lib/admin-data';

const ALLOWED = new Set(['feedback', 'file', 'subject', 'programme']);

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  let payload: { entityType?: unknown; entityId?: unknown; pinned?: unknown };
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
  const pinned = payload.pinned === true;
  await setPinned(payload.entityType, payload.entityId, pinned);
  await logActivity(pinned ? 'item.pinned' : 'item.unpinned', payload.entityType, payload.entityId, '');
  revalidateTag('feedback', 'max');
  return NextResponse.json({ success: true, pinned });
}
