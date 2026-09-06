'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowUp, Check, Loader2, Pin, PinOff, StickyNote, Trash2 } from 'lucide-react';
import { SearchResultsSkeleton } from '@/components/Skeleton';
import { AdminEmpty, AdminError } from '@/components/admin/ui';
import { ADMIN_PAGE_SIZE, Pagination } from '@/components/admin/Pagination';
import { MoreMenu } from '@/components/MoreMenu';
import { useRefreshWithTransition } from '@/hooks/useRefreshWithTransition';
import { notifyLiveSync } from '@/hooks/useLiveSync';
import type { FeedbackItem, FeedbackStatus } from '@/lib/feedback';

const STATUSES: FeedbackStatus[] = ['new', 'reviewed', 'planned', 'in_progress', 'completed', 'declined', 'archived'];

const LABELS: Record<FeedbackStatus, string> = {
  new: 'New', reviewed: 'Reviewed', planned: 'Planned', in_progress: 'In progress',
  completed: 'Completed', declined: 'Declined', archived: 'Archived', open: 'New',
};

export function FeedbackAdminClient() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [pins, setPins] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'popular' | 'newest'>('newest');
  const [status, setStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeedbackItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteDone, setDeleteDone] = useState(false);
  const [noteTarget, setNoteTarget] = useState<FeedbackItem | null>(null);
  const [noteBody, setNoteBody] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteError, setNoteError] = useState('');
  const { refresh } = useRefreshWithTransition();
  void refresh;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ sort, status, page: String(page), limit: String(ADMIN_PAGE_SIZE) });
      if (q.trim()) params.set('q', q.trim());
      const res = await fetch(`/api/admin/feedback?${params.toString()}`);
      if (res.status === 403) throw new Error('Not authorized');
      if (!res.ok) throw new Error('Failed to load feedback');
      const data = (await res.json()) as { items: FeedbackItem[]; total: number };
      setItems(data.items ?? []);
      setTotal(Number(data.total ?? 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [q, sort, status, page]);

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  async function changeStatus(item: FeedbackItem, next: FeedbackStatus) {
    if (busyId) return;
    setBusyId(item.id);
    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, status: next }),
      });
      if (!res.ok) throw new Error('Status change failed');
      const data = (await res.json()) as { item: FeedbackItem };
      setItems((cur) => cur.map((x) => (x.id === item.id ? data.item : x)));
      notifyLiveSync('feedback');
    } catch {
      setError('Status change failed. Try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function togglePin(item: FeedbackItem) {
    if (busyId) return;
    setBusyId(item.id);
    try {
      const pinned = !pins.has(item.id);
      const res = await fetch('/api/admin/pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'feedback', entityId: item.id, pinned }),
      });
      if (!res.ok) throw new Error('Pin failed');
      setPins((prev) => {
        const next = new Set(prev);
        if (pinned) next.add(item.id);
        else next.delete(item.id);
        return next;
      });
    } catch {
      setError('Pin failed. Try again.');
    } finally {
      setBusyId(null);
    }
  }

  function openDelete(item: FeedbackItem) {
    if (busyId) return;
    setDeleteTarget(item);
    setDeleteError('');
    setDeleteDone(false);
  }

  function closeDelete() {
    setDeleteTarget(null);
    setDeleting(false);
    setDeleteError('');
    setDeleteDone(false);
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting || deleteDone) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/admin/feedback?id=${encodeURIComponent(deleteTarget.id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      const wasLastOnPage = items.length === 1 && page > 1;
      setItems((cur) => cur.filter((x) => x.id !== deleteTarget.id));
      setTotal((t) => Math.max(0, t - 1));
      setDeleteDone(true);
      notifyLiveSync('feedback');
      setTimeout(() => {
        closeDelete();
        if (wasLastOnPage) setPage((p) => Math.max(1, p - 1));
      }, 1200);
    } catch {
      setDeleteError('Delete failed. Try again.');
    } finally {
      setDeleting(false);
    }
  }

  async function saveNote() {
    if (!noteTarget || noteBusy || !noteBody.trim()) return;
    setNoteBusy(true);
    setNoteError('');
    try {
      const res = await fetch('/api/admin/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'feedback', entityId: noteTarget.id, body: noteBody }),
      });
      if (!res.ok) throw new Error('Note failed');
      setNoteBody('');
      setNoteTarget(null);
    } catch {
      setNoteError('Could not save note.');
    } finally {
      setNoteBusy(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid min-w-0 grid-cols-1 gap-2 rounded-[1.75rem] bg-sheet p-3 sm:grid-cols-[1fr_auto_auto] md:p-4">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Search feedback…"
          className="min-h-11 w-full rounded-2xl border border-line bg-white px-4 py-2 text-sm outline-none placeholder:text-muted/60 focus:border-ink"
        />
        <select value={sort} onChange={(e) => { setSort(e.target.value as 'popular' | 'newest'); setPage(1); }} className="min-h-11 rounded-2xl border border-line bg-white px-4 py-2 text-sm font-semibold outline-none focus:border-ink" aria-label="Sort">
          <option value="newest">Newest</option>
          <option value="popular">Most upvoted</option>
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="min-h-11 rounded-2xl border border-line bg-white px-4 py-2 text-sm font-semibold outline-none focus:border-ink" aria-label="Status">
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{LABELS[s]}</option>
          ))}
        </select>
      </div>

      {loading && <SearchResultsSkeleton />}
      {!loading && error && <AdminError message={error} onRetry={load} />}
      {!loading && !error && items.length === 0 && <AdminEmpty title="No feedback" hint="Nothing matches this search or filter." />}

      {!loading && !error && items.length > 0 && (
        <div className="divide-y divide-line/70">
          {items.map((item) => (
            <article key={item.id} className="min-w-0 rounded-2xl px-2 py-4 md:px-4">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-2xl border border-line bg-white px-3 py-1.5 text-sm font-black tabular-nums">
                  <ArrowUp size={14} /> {item.votesCount}
                </span>
                <span className="rounded-full border border-line bg-sheet px-2.5 py-1 text-xs font-bold">{LABELS[item.status] ?? item.status}</span>
                {pins.has(item.id) && <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-xs font-bold text-paper"><Pin size={12} /> Pinned</span>}
                <span className="ml-auto font-mono text-xs text-muted">{new Date(item.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-dynamic mt-3 text-base font-semibold leading-6 text-ink">{item.body}</p>
              <p className="mt-1 font-mono text-xs text-muted">{item.id}</p>
              <div className="mt-3 flex min-w-0 items-center gap-2">
                <select
                  value={item.status}
                  disabled={busyId === item.id}
                  onChange={(e) => changeStatus(item, e.target.value as FeedbackStatus)}
                  className="min-h-11 min-w-0 flex-1 rounded-2xl border border-line bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-ink disabled:opacity-50 sm:max-w-52"
                  aria-label={`Status for ${item.id}`}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{LABELS[s]}</option>
                  ))}
                </select>
                <span className="ml-auto shrink-0">
                  <MoreMenu
                    label={`Actions for feedback ${item.id}`}
                    items={[
                      {
                        key: 'pin',
                        label: pins.has(item.id) ? 'Unpin' : 'Pin',
                        icon: pins.has(item.id) ? <PinOff size={16} strokeWidth={1.5} /> : <Pin size={16} strokeWidth={1.5} />,
                        onClick: () => togglePin(item),
                      },
                      {
                        key: 'note',
                        label: 'Private note',
                        icon: <StickyNote size={16} strokeWidth={1.5} />,
                        onClick: () => { setNoteTarget(item); setNoteBody(''); setNoteError(''); },
                      },
                      {
                        key: 'delete',
                        label: 'Delete',
                        danger: true,
                        icon: <Trash2 size={16} strokeWidth={1.5} />,
                        onClick: () => openDelete(item),
                      },
                    ]}
                  />
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && !error && (
        <Pagination page={page} totalPages={Math.ceil(total / ADMIN_PAGE_SIZE)} onChange={setPage} />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/10 p-4 backdrop-blur-sm" onClick={() => { if (!deleting && !deleteDone) closeDelete(); }}>
          <div className="w-full max-w-[360px] rounded-[2rem] border border-line bg-white p-5 shadow-[0_24px_90px_rgba(23,20,17,0.16)]" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            {deleteDone ? (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100"><Check size={18} className="text-green-700" /></div>
                <div className="min-w-0"><p className="text-base font-bold text-ink">Deleted</p><p className="truncate font-mono text-xs text-muted">{deleteTarget.id}</p></div>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-black tracking-tight text-ink">Delete feedback</h3>
                <p className="mt-1 text-sm leading-6 text-muted">Delete “{deleteTarget.body.slice(0, 120)}”? Votes go with it. This cannot be undone.</p>
                {deleteError && <p className="mt-2 text-sm text-red-600">{deleteError}</p>}
                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button onClick={closeDelete} disabled={deleting} className="px-5 py-2.5 text-sm font-semibold text-muted hover:text-ink disabled:opacity-50">Cancel</button>
                  <button onClick={confirmDelete} disabled={deleting} className="flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                    {deleting && <Loader2 size={14} className="animate-spin" />} {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {noteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/10 p-4 backdrop-blur-sm" onClick={() => !noteBusy && setNoteTarget(null)}>
          <div className="w-full max-w-[400px] rounded-[2rem] border border-line bg-white p-5" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3 className="text-xl font-black tracking-tight text-ink">Private note</h3>
            <p className="mt-1 font-mono text-xs text-muted">{noteTarget.id} · never shown publicly</p>
            <textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value.slice(0, 2000))} rows={4} placeholder="Context for future you…" className="mt-3 min-h-28 w-full resize-none rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-ink" />
            {noteError && <p className="mt-2 text-sm text-red-600">{noteError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setNoteTarget(null)} disabled={noteBusy} className="px-5 py-2.5 text-sm font-semibold text-muted hover:text-ink disabled:opacity-50">Cancel</button>
              <button onClick={saveNote} disabled={noteBusy || !noteBody.trim()} className="flex items-center gap-2 rounded-2xl bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-accent disabled:opacity-40">
                {noteBusy && <Loader2 size={14} className="animate-spin" />} Save note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
