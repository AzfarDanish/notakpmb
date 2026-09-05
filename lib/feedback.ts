import { cache } from 'react';
import { dbOr, supabaseAdmin } from '@/lib/supabase';

export type FeedbackStatus = 'new' | 'reviewed' | 'planned' | 'in_progress' | 'completed' | 'declined' | 'archived' | 'open';
export type FeedbackSort = 'popular' | 'newest';

export type FeedbackItem = {
  id: string
  body: string
  status: FeedbackStatus
  votesCount: number
  createdAt: string
  updatedAt: string
  hasVoted: boolean
}

const VALID_STATUSES = new Set<FeedbackStatus>(['new', 'reviewed', 'planned', 'in_progress', 'completed', 'declined', 'archived', 'open']);
const MAX_BODY_LENGTH = 500;
const MIN_BODY_LENGTH = 4;

export function normalizeFeedbackBody(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Feedback must be text');
  const body = value.replace(/\s+/g, ' ').trim();
  if (body.length < MIN_BODY_LENGTH) throw new Error('Feedback is too short');
  if (body.length > MAX_BODY_LENGTH) throw new Error('Feedback is too long');
  return body;
}

export function normalizeFeedbackStatus(value: unknown): FeedbackStatus {
  if (typeof value !== 'string' || !VALID_STATUSES.has(value as FeedbackStatus)) {
    throw new Error('Invalid status');
  }
  return value as FeedbackStatus;
}

export function normalizeFeedbackSort(value: string | null): FeedbackSort {
  return value === 'newest' ? 'newest' : 'popular';
}

export function normalizeStatusFilter(value: string | null): FeedbackStatus | 'all' {
  if (!value || value === 'all') return 'all';
  if (!VALID_STATUSES.has(value as FeedbackStatus)) return 'all';
  return value as FeedbackStatus;
}

type FeedbackRow = {
  id: string; body: string; status: string; votes_count: number;
  created_at: string; updated_at: string; has_voted?: number | boolean;
};

function mapFeedbackRow(row: FeedbackRow): FeedbackItem {
  const raw = String(row.status ?? 'new');
  // Legacy alias: 'open' maps to 'new'
  const status = (raw === 'open' ? 'new' : raw) as FeedbackStatus;
  return {
    id: String(row.id ?? ''),
    body: String(row.body ?? ''),
    status,
    votesCount: Number(row.votes_count ?? 0),
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
    hasVoted: Boolean(Number(row.has_voted ?? 0)),
  };
}

export async function searchFeedbackAdmin(query: string, sort: FeedbackSort = 'newest', status: FeedbackStatus | 'all' = 'all', limit = 50): Promise<FeedbackItem[]> {
  const q = query.trim();
  const capped = Math.min(Math.max(limit, 1), 100);
  let builder = supabaseAdmin().from('feedback_items').select('id, body, status, votes_count, created_at, updated_at');
  if (status === 'new') {
    builder = builder.in('status', ['new', 'open']);
  } else if (status !== 'all') {
    builder = builder.eq('status', status);
  }
  if (q) {
    const like = `%${q}%`;
    builder = builder.or(`body.ilike.${like},id.ilike.${like}`);
  }
  builder = sort === 'newest'
    ? builder.order('created_at', { ascending: false }).order('votes_count', { ascending: false })
    : builder.order('votes_count', { ascending: false }).order('created_at', { ascending: false });
  const { data, error } = await builder.limit(capped);
  if (error) throw error;
  return ((data ?? []) as FeedbackRow[]).map((r) => mapFeedbackRow({ ...r, has_voted: 0 }));
}

export async function getFeedbackCounts(): Promise<{ total: number; votes: number }> {
  const { count: total, error } = await supabaseAdmin().from('feedback_items').select('id', { count: 'exact', head: true });
  if (error) throw error;
  const { data: votesRows, error: vErr } = await supabaseAdmin().from('feedback_items').select('votes_count');
  if (vErr) throw vErr;
  const votes = ((votesRows ?? []) as { votes_count: number }[]).reduce((a, r) => a + Number(r.votes_count ?? 0), 0);
  return { total: total ?? 0, votes };
}

export const listFeedback = cache(async ({
  sort = 'popular',
  status = 'all',
  voterHash,
}: {
  sort?: FeedbackSort
  status?: FeedbackStatus | 'all'
  voterHash?: string
} = {}): Promise<FeedbackItem[]> => {
  return dbOr(async () => {
    let builder = supabaseAdmin().from('feedback_items').select('id, body, status, votes_count, created_at, updated_at');
    // Public board: 'all' excludes archived (admin-only). Explicit status still works.
    if (status === 'all') {
      builder = builder.neq('status', 'archived');
    } else {
      builder = builder.eq('status', status);
    }
    builder = sort === 'newest'
      ? builder.order('created_at', { ascending: false }).order('votes_count', { ascending: false })
      : builder.order('votes_count', { ascending: false }).order('created_at', { ascending: false });
    const { data, error } = await builder.limit(100);
    if (error) throw error;
    const rows = (data ?? []) as FeedbackRow[];
    let voted = new Set<string>();
    if (voterHash && rows.length > 0) {
      const { data: votes } = await supabaseAdmin()
        .from('feedback_votes')
        .select('feedback_id')
        .eq('voter_hash', voterHash)
        .in('feedback_id', rows.map((r) => r.id));
      voted = new Set(((votes ?? []) as { feedback_id: string }[]).map((v) => v.feedback_id));
    }
    return rows.map((r) => mapFeedbackRow({ ...r, has_voted: voted.has(r.id) ? 1 : 0 }));
  }, []);
});

export async function createFeedback(body: string): Promise<FeedbackItem> {
  const id = `fb-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  const { error } = await supabaseAdmin().from('feedback_items').insert({ id, body });
  if (error) throw error;
  const { data, error: selErr } = await supabaseAdmin()
    .from('feedback_items')
    .select('id, body, status, votes_count, created_at, updated_at')
    .eq('id', id)
    .limit(1)
    .maybeSingle();
  if (selErr) throw selErr;
  if (!data) throw new Error('Failed to create feedback');
  return mapFeedbackRow({ ...(data as FeedbackRow), has_voted: 0 });
}

export async function voteFeedback(id: string, voterHash: string): Promise<{ item: FeedbackItem; inserted: boolean }> {
  const sb = supabaseAdmin();
  const { data: exists, error: exErr } = await sb.from('feedback_items').select('id').eq('id', id).limit(1);
  if (exErr) throw exErr;
  if (!exists || exists.length === 0) throw new Error('Feedback not found');

  const { error: insErr } = await sb.from('feedback_votes').insert({ feedback_id: id, voter_hash: voterHash });
  let inserted = !insErr;
  if (insErr) {
    if (insErr.code !== '23505') throw insErr; // unique violation = already voted
    inserted = false;
  }
  if (inserted) {
    // Atomic counter increment (avoids read-modify-write race)
    const { data: cur, error: curErr } = await sb.from('feedback_items').select('votes_count').eq('id', id).limit(1).maybeSingle();
    if (curErr) throw curErr;
    const next = Number((cur as { votes_count: number } | null)?.votes_count ?? 0) + 1;
    const { error: upErr } = await sb
      .from('feedback_items')
      .update({ votes_count: next, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (upErr) throw upErr;
  }

  const { data: item, error: itemErr } = await sb
    .from('feedback_items')
    .select('id, body, status, votes_count, created_at, updated_at')
    .eq('id', id)
    .limit(1)
    .maybeSingle();
  if (itemErr) throw itemErr;
  if (!item) throw new Error('Feedback not found');
  const { data: voted } = await sb
    .from('feedback_votes')
    .select('feedback_id')
    .eq('feedback_id', id)
    .eq('voter_hash', voterHash)
    .limit(1);
  return { item: mapFeedbackRow({ ...(item as FeedbackRow), has_voted: voted && voted.length > 0 ? 1 : 0 }), inserted };
}

export async function updateFeedbackStatus(id: string, status: FeedbackStatus): Promise<FeedbackItem> {
  const { error } = await supabaseAdmin()
    .from('feedback_items')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  const { data, error: selErr } = await supabaseAdmin()
    .from('feedback_items')
    .select('id, body, status, votes_count, created_at, updated_at')
    .eq('id', id)
    .limit(1)
    .maybeSingle();
  if (selErr) throw selErr;
  if (!data) throw new Error('Feedback not found');
  return mapFeedbackRow({ ...(data as FeedbackRow), has_voted: 0 });
}

export async function deleteFeedback(id: string): Promise<void> {
  const { error } = await supabaseAdmin().from('feedback_items').delete().eq('id', id);
  if (error) throw error;
}

export async function incrementRateLimit({
  voterHash,
  action,
  max,
  windowMs,
}: {
  voterHash: string
  action: string
  max: number
  windowMs: number
}) {
  const sb = supabaseAdmin();
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const key = `${action}:${voterHash}:${windowStart}`;
  // Optimistic-concurrency increment (retries on concurrent writers).
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: cur, error: selErr } = await sb.from('feedback_rate_limits').select('count').eq('key', key).limit(1).maybeSingle();
    if (selErr) throw selErr;
    if (!cur) {
      const { error: insErr } = await sb
        .from('feedback_rate_limits')
        .insert({ key, voter_hash: voterHash, action, window_start: windowStart, count: 1 });
      if (!insErr) {
        if (1 > max) throw new Error('Too many requests');
        return;
      }
      if (insErr.code !== '23505') throw insErr;
      continue; // concurrent insert won; retry as increment
    }
    const current = Number((cur as { count: number }).count ?? 0);
    const { data: updated, error: upErr } = await sb
      .from('feedback_rate_limits')
      .update({ count: current + 1 })
      .eq('key', key)
      .eq('count', current)
      .select('count');
    if (upErr) throw upErr;
    if (!updated || updated.length === 0) continue; // concurrent write; retry
    if (current + 1 > max) throw new Error('Too many requests');
    return;
  }
  throw new Error('Too many requests');
}
