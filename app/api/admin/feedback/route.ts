import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { logActivity, requireAdmin } from '@/lib/admin';
import { countFeedbackAdmin, deleteFeedback, normalizeFeedbackSort, searchFeedbackAdmin } from '@/lib/feedback';

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const q = req.nextUrl.searchParams.get('q') ?? '';
  const sort = normalizeFeedbackSort(req.nextUrl.searchParams.get('sort'));
  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit')) || 30, 1), 30);
  const page = Math.max(Number(req.nextUrl.searchParams.get('page')) || 1, 1);
  try {
    const [items, total] = await Promise.all([
      searchFeedbackAdmin(q, sort, limit, (page - 1) * limit),
      countFeedbackAdmin(q),
    ]);
    return NextResponse.json({ items, total, page, limit }, { headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' } });
  } catch (e) {
    console.error('Admin feedback list error:', e);
    return NextResponse.json({ error: 'Failed to load feedback' }, { status: 500 });
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
