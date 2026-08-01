import { NextRequest, NextResponse } from 'next/server';
import { isR2Configured } from '@/lib/r2';
import { addSubject, deleteSubject } from '@/lib/subjects';

export async function POST(request: NextRequest) {
  if (!isR2Configured()) {
    return NextResponse.json({ error: 'R2 not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { programmeId, title, code, intake } = (body ?? {}) as Record<string, unknown>;
  if (
    typeof programmeId !== 'string' ||
    typeof title !== 'string'
  ) {
    return NextResponse.json(
      { error: 'programmeId and title are required' },
      { status: 400 },
    );
  }
  if (intake !== undefined && (typeof intake !== 'string' || intake.trim().length > 60)) {
    return NextResponse.json({ error: 'intake must be a short string' }, { status: 400 });
  }

  try {
    const subject = await addSubject({
      programmeId,
      title,
      code: typeof code === 'string' ? code : undefined,
      intake: typeof intake === 'string' ? intake : undefined,
    });
    return NextResponse.json({ subject });
  } catch (e) {
    if (
      e instanceof Error &&
      (e.message === 'Unknown programme' ||
        e.message === 'Subject title is required')
    ) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error('Add subject error:', e);
    return NextResponse.json({ error: 'Failed to add subject' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isR2Configured()) {
    return NextResponse.json({ error: 'R2 not configured' }, { status: 503 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    const result = await deleteSubject(id);
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    if (e instanceof Error && e.message === 'Subject not found') {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    console.error('Delete subject error:', e);
    return NextResponse.json({ error: 'Failed to delete subject' }, { status: 500 });
  }
}
