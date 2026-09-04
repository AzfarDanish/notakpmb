import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { isR2Configured } from '@/lib/r2';
import { isD1Configured } from '@/lib/d1';
import { addSubject, deleteSubject, renameSubject } from '@/lib/subjects';

export async function POST(request: NextRequest) {
  if (!isD1Configured()) {
    return NextResponse.json({ error: 'D1 not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { programmeId, title, code } = (body ?? {}) as Record<string, unknown>;
  if (
    typeof programmeId !== 'string' ||
    typeof title !== 'string' ||
    typeof code !== 'string'
  ) {
    return NextResponse.json(
      { error: 'programmeId, title and code are required' },
      { status: 400 },
    );
  }

  try {
    const subject = await addSubject({ programmeId, title, code });
    revalidateTag('subjects', 'max');
    return NextResponse.json({ subject });
  } catch (e) {
    if (
      e instanceof Error &&
      (e.message === 'Unknown programme' ||
        e.message === 'Subject title is required' ||
        e.message === 'Course code is required')
    ) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    if (e instanceof Error && e.message === 'Subject already exists') {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    console.error('Add subject error:', e);
    return NextResponse.json({ error: 'Failed to add subject' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isD1Configured()) {
    return NextResponse.json({ error: 'D1 not configured' }, { status: 503 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { title, code } = (body ?? {}) as Record<string, unknown>;
  if (typeof title !== 'string' || typeof code !== 'string') {
    return NextResponse.json(
      { error: 'title and code are required' },
      { status: 400 },
    );
  }

  try {
    const subject = await renameSubject({ id, title, code });
    revalidateTag('subjects', 'max');
    return NextResponse.json({ subject });
  } catch (e) {
    if (e instanceof Error && e.message === 'Subject title is required') {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    if (e instanceof Error && e.message === 'Course code is required') {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    if (e instanceof Error && e.message === 'Subject not found') {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    console.error('Rename subject error:', e);
    return NextResponse.json({ error: 'Failed to rename subject' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isD1Configured() || !isR2Configured()) {
    return NextResponse.json(
      { error: 'D1 and R2 must be configured' },
      { status: 503 },
    );
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    const result = await deleteSubject(id);
    revalidateTag('subjects', 'max');
    revalidateTag('r2-files', 'max');
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    if (e instanceof Error && e.message === 'Subject not found') {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    console.error('Delete subject error:', e);
    return NextResponse.json({ error: 'Failed to delete subject' }, { status: 500 });
  }
}
