import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { isSupabaseConfigured } from '@/lib/supabase';
import { incrementRateLimit, voteFeedback } from '@/lib/feedback';
import { ensureFeedbackIdentity, setFeedbackIdentityCookie } from '../../identity';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const identity = ensureFeedbackIdentity(request);
  try {
    await incrementRateLimit({
      voterHash: identity.hash,
      action: 'feedback-vote',
      max: 60,
      windowMs: 60 * 60 * 1000,
    });
    const result = await voteFeedback(id, identity.hash);
    revalidateTag('feedback', 'max');
    const response = NextResponse.json({ item: result.item, inserted: result.inserted });
    setFeedbackIdentityCookie(response, identity.raw);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === 'Feedback not found') {
      const response = NextResponse.json({ error: error.message }, { status: 404 });
      setFeedbackIdentityCookie(response, identity.raw);
      return response;
    }
    if (error instanceof Error && error.message === 'Too many requests') {
      const response = NextResponse.json({ error: 'Please wait before voting more.' }, { status: 429 });
      setFeedbackIdentityCookie(response, identity.raw);
      return response;
    }
    console.error('Feedback vote error:', error);
    return NextResponse.json({ error: 'Failed to vote' }, { status: 500 });
  }
}
