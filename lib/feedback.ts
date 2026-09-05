import { cache } from 'react';
import { d1Or, queryD1 } from '@/lib/d1';

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

function mapFeedbackRow(row: Record<string, unknown>): FeedbackItem {
  const raw = String(row.status ?? 'new');
  // Legacy alias: 'open' (pre-0007) maps to 'new'
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
  const orderBy = sort === 'newest' ? 'created_at DESC, votes_count DESC' : 'votes_count DESC, created_at DESC';
  const where: string[] = [];
  const params: (string | number | null)[] = [];
  if (status !== 'all') {
    if (status === 'new') {
      where.push(`(f.status = 'new' OR f.status = 'open')`);
    } else {
      where.push(`f.status = ?`);
      params.push(status);
    }
  }
  if (q) {
    where.push(`(lower(f.body) LIKE ? OR lower(f.id) LIKE ?)`);
    const like = `%${q.toLowerCase()}%`;
    params.push(like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const res = await queryD1(
    `SELECT f.id, f.body, f.status, f.votes_count, f.created_at, f.updated_at, 0 AS has_voted
     FROM feedback_items f ${whereSql} ORDER BY ${orderBy} LIMIT ?`,
    [...params, Math.min(Math.max(limit, 1), 100)],
  );
  return res.results.map(mapFeedbackRow);
}

export async function getFeedbackCounts(): Promise<{ total: number; votes: number }> {
  const res = await queryD1(`SELECT COUNT(*) as total, COALESCE(SUM(votes_count),0) as votes FROM feedback_items`);
  const row = res.results[0] ?? {};
  return { total: Number(row.total ?? 0), votes: Number(row.votes ?? 0) };
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
  const orderBy = sort === 'newest'
    ? 'created_at DESC, votes_count DESC'
    : 'votes_count DESC, created_at DESC';
  const votedSelect = voterHash
    ? `EXISTS(SELECT 1 FROM feedback_votes v WHERE v.feedback_id = f.id AND v.voter_hash = ?) AS has_voted`
    : '0 AS has_voted';
  const params: (string | number | null)[] = voterHash ? [voterHash] : [];
  // Public board: 'all' excludes archived (admin-only). Explicit status still works.
  const where = status === 'all' ? `WHERE f.status != 'archived'` : 'WHERE f.status = ?';
  if (status !== 'all') params.push(status);

  return d1Or(async () => {
    const res = await queryD1(
      `SELECT f.id, f.body, f.status, f.votes_count, f.created_at, f.updated_at, ${votedSelect}
       FROM feedback_items f
       ${where}
       ORDER BY ${orderBy}
       LIMIT 100`,
      params,
    );
    return res.results.map(mapFeedbackRow);
  }, []);
});

export async function createFeedback(body: string): Promise<FeedbackItem> {
  const id = `fb-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  await queryD1(
    `INSERT INTO feedback_items (id, body) VALUES (?, ?)`,
    [id, body],
  );
  const res = await queryD1(
    `SELECT id, body, status, votes_count, created_at, updated_at, 0 AS has_voted
     FROM feedback_items WHERE id = ? LIMIT 1`,
    [id],
  );
  const item = res.results[0];
  if (!item) throw new Error('Failed to create feedback');
  return mapFeedbackRow(item);
}

export async function voteFeedback(id: string, voterHash: string): Promise<{ item: FeedbackItem; inserted: boolean }> {
  const exists = await queryD1('SELECT id FROM feedback_items WHERE id = ? LIMIT 1', [id]);
  if (exists.results.length === 0) throw new Error('Feedback not found');

  const insert = await queryD1(
    `INSERT OR IGNORE INTO feedback_votes (feedback_id, voter_hash) VALUES (?, ?)`,
    [id, voterHash],
  );
  const inserted = Boolean(insert.meta.changes && insert.meta.changes > 0);
  if (inserted) {
    await queryD1(
      `UPDATE feedback_items
       SET votes_count = votes_count + 1, updated_at = datetime('now')
       WHERE id = ?`,
      [id],
    );
  }

  const res = await queryD1(
    `SELECT f.id, f.body, f.status, f.votes_count, f.created_at, f.updated_at,
            EXISTS(SELECT 1 FROM feedback_votes v WHERE v.feedback_id = f.id AND v.voter_hash = ?) AS has_voted
     FROM feedback_items f
     WHERE f.id = ?
     LIMIT 1`,
    [voterHash, id],
  );
  const item = res.results[0];
  if (!item) throw new Error('Feedback not found');
  return { item: mapFeedbackRow(item), inserted };
}

export async function updateFeedbackStatus(id: string, status: FeedbackStatus): Promise<FeedbackItem> {
  await queryD1(
    `UPDATE feedback_items SET status = ?, updated_at = datetime('now') WHERE id = ?`,
    [status, id],
  );
  const res = await queryD1(
    `SELECT id, body, status, votes_count, created_at, updated_at, 0 AS has_voted
     FROM feedback_items WHERE id = ? LIMIT 1`,
    [id],
  );
  const item = res.results[0];
  if (!item) throw new Error('Feedback not found');
  return mapFeedbackRow(item);
}

export async function deleteFeedback(id: string): Promise<void> {
  await queryD1('DELETE FROM feedback_items WHERE id = ?', [id]);
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
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const key = `${action}:${voterHash}:${windowStart}`;
  await queryD1(
    `INSERT INTO feedback_rate_limits (key, voter_hash, action, window_start, count)
     VALUES (?, ?, ?, ?, 1)
     ON CONFLICT(key) DO UPDATE SET count = count + 1`,
    [key, voterHash, action, windowStart],
  );
  const res = await queryD1('SELECT count FROM feedback_rate_limits WHERE key = ? LIMIT 1', [key]);
  const count = Number(res.results[0]?.count ?? 0);
  if (count > max) throw new Error('Too many requests');
}
