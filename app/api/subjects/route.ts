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

  const { programmeId, semesterId, title, code } = (body ?? {}) as Record<string, unknown>;
  if (
    typeof programmeId !== 'string' ||
    typeof semesterId !== 'string' ||
    typeof title !== 'string'
  ) {
    return NextResponse.json(
      { error: 'programmeId, semesterId and title are required' },
      { status: 400 },
    );
  }

  try {
    const subject = await addSubject({
      programmeId,
      semesterId,
      title,
      code: typeof code === 'string' ? code : undefined,
    });
    return NextResponse.json({ subject });
  } catch (e) {
    if (
      e instanceof Error &&
      (e.message === 'Unknown programme or semester' ||
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
