import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { logActivity, requireAdmin } from '@/lib/admin';
import { publishAnnouncement, unpublishAnnouncement } from '@/lib/announcements';

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req); if (denied) return denied;
  try {
    const body = await req.json() as { id?: unknown; action?: unknown };
    if (typeof body.id !== 'string' || !body.id) throw new Error('id is required');
    if (body.action === 'unpublish') {
      const item = await unpublishAnnouncement(body.id);
      await logActivity('announcement.unpublished', 'announcement', body.id, item.title);
      revalidateTag('announcements', 'max'); return NextResponse.json({ item });
    }
    const item = await publishAnnouncement(body.id);
    await logActivity('announcement.published', 'announcement', body.id, item?.title ?? '');
    revalidateTag('announcements', 'max'); return NextResponse.json({ item });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Publish failed' }, { status: 400 }); }
}
