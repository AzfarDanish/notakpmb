import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { isD1Configured } from '@/lib/d1';
import {
  createFeedback,
  deleteFeedback,
  incrementRateLimit,
  listFeedback,
  normalizeFeedbackBody,
  normalizeFeedbackSort,
  normalizeFeedbackStatus,
  normalizeStatusFilter,
  updateFeedbackStatus,
} from '@/lib/feedback';
import { ensureFeedbackIdentity, getFeedbackIdentity, setFeedbackIdentityCookie } from './identity';

export async function GET(request: NextRequest) {
  const sort = normalizeFeedbackSort(request.nextUrl.searchParams.get('sort'));
  const status = normalizeStatusFilter(request.nextUrl.searchParams.get('status'));
  const { hash } = getFeedbackIdentity(request);
  const items = await listFeedback({ sort, status, voterHash: hash ?? undefined });
  return NextResponse.json({ items }, {
    headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' },
  });
}

export async function POST(request: NextRequest) {
  if (!isD1Configured()) {
    return NextResponse.json({ error: 'D1 not configured' }, { status: 503 });
  }

  let body: string;
  try {
    const payload = (await request.json()) as { body?: unknown };
    body = normalizeFeedbackBody(payload.body);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid feedback' },
      { status: 400 },
    );
  }

  const identity = ensureFeedbackIdentity(request);
  try {
    await incrementRateLimit({
      voterHash: identity.hash,
      action: 'feedback-submit',
      max: 5,
      windowMs: 60 * 60 * 1000,
    });
    const item = await createFeedback(body);
    revalidateTag('feedback', 'max');
    const response = NextResponse.json({ item }, { status: 201 });
    setFeedbackIdentityCookie(response, identity.raw);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === 'Too many requests') {
      const response = NextResponse.json({ error: 'Please wait before submitting more feedback.' }, { status: 429 });
      setFeedbackIdentityCookie(response, identity.raw);
      return response;
    }
    console.error('Feedback create error:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!hasAdminAccess(request)) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }

  try {
    const payload = (await request.json()) as { id?: unknown; status?: unknown };
    if (typeof payload.id !== 'string' || !payload.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    const status = normalizeFeedbackStatus(payload.status);
    const item = await updateFeedbackStatus(payload.id, status);
    revalidateTag('feedback', 'max');
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update feedback';
    return NextResponse.json({ error: message }, { status: message === 'Invalid status' ? 400 : 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!hasAdminAccess(request)) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  await deleteFeedback(id);
  revalidateTag('feedback', 'max');
  return NextResponse.json({ success: true });
}

function hasAdminAccess(request: NextRequest): boolean {
  const expected = process.env.FEEDBACK_ADMIN_TOKEN;
  if (!expected) return false;
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const header = request.headers.get('x-admin-token');
  return bearer === expected || header === expected;
}
