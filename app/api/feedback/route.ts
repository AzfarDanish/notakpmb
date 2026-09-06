import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  createFeedback,
  incrementRateLimit,
  listFeedback,
  normalizeFeedbackBody,
  normalizeFeedbackSort,
} from '@/lib/feedback';
import { ensureFeedbackIdentity, getFeedbackIdentity, setFeedbackIdentityCookie } from './identity';

export async function GET(request: NextRequest) {
  const sort = normalizeFeedbackSort(request.nextUrl.searchParams.get('sort'));
  const { hash } = getFeedbackIdentity(request);
  const items = await listFeedback({ sort, voterHash: hash ?? undefined });
  return NextResponse.json({ items }, {
    headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' },
  });
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
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
