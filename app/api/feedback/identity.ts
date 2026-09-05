import { createHash, randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'notakpmb_feedback_id';
const ONE_YEAR = 60 * 60 * 24 * 365;

export function getFeedbackIdentity(request: NextRequest): {
  raw: string | null
  hash: string | null
} {
  const raw = request.cookies.get(COOKIE_NAME)?.value ?? null;
  return { raw, hash: raw ? hashFeedbackIdentity(raw) : null };
}

export function ensureFeedbackIdentity(request: NextRequest): {
  raw: string
  hash: string
  isNew: boolean
} {
  const existing = request.cookies.get(COOKIE_NAME)?.value;
  const raw = existing && existing.length >= 24 ? existing : randomUUID();
  return { raw, hash: hashFeedbackIdentity(raw), isNew: raw !== existing };
}

export function setFeedbackIdentityCookie(response: NextResponse, raw: string) {
  response.cookies.set(COOKIE_NAME, raw, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ONE_YEAR,
  });
}

function hashFeedbackIdentity(value: string): string {
  const salt = process.env.FEEDBACK_COOKIE_SALT ?? process.env.D1_DATABASE_ID ?? 'notakpmb-feedback';
  return createHash('sha256').update(`${salt}:${value}`).digest('hex');
}
