'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { ArrowLeft, ArrowUp, CheckCircle2, Clock3, Loader2, MessageSquarePlus, Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { SearchResultsSkeleton } from '@/components/Skeleton';
import type { FeedbackItem, FeedbackSort, FeedbackStatus } from '@/lib/feedback';

type StatusFilter = FeedbackStatus | 'all';

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  open: 'Open',
  planned: 'Planned',
  in_progress: 'In progress',
  completed: 'Completed',
  declined: 'Declined',
};

const STATUS_STYLES: Record<FeedbackStatus, string> = {
  open: 'bg-white text-muted border-line',
  planned: 'bg-blue-50 text-blue-700 border-blue-100',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-100',
  completed: 'bg-green-50 text-green-700 border-green-100',
  declined: 'bg-neutral-100 text-neutral-600 border-neutral-200',
};

export function FeedbackBoard() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [sort, setSort] = useState<FeedbackSort>('popular');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ sort });
    if (status !== 'all') params.set('status', status);

    fetch(`/api/feedback?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load feedback');
        return res.json() as Promise<{ items: FeedbackItem[] }>;
      })
      .then((data) => {
        startTransition(() => setItems(data.items ?? []));
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error(err);
        setError('Could not load feedback. Please try again.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [sort, status]);

  async function submitFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = body.replace(/\s+/g, ' ').trim();
    if (!value || isPending) return;
    setSubmitError('');

    startTransition(async () => {
      try {
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: value }),
        });
        const data = await res.json().catch(() => null) as { item?: FeedbackItem; error?: string } | null;
        if (!res.ok || !data?.item) throw new Error(data?.error || 'Failed to submit feedback');
        setItems((current) => sortFeedback([data.item!, ...current], sort));
        setBody('');
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Failed to submit feedback');
      }
    });
  }

  async function vote(item: FeedbackItem) {
    if (item.hasVoted) return;
    setItems((current) =>
      sortFeedback(current.map((entry) => entry.id === item.id
        ? { ...entry, hasVoted: true, votesCount: entry.votesCount + 1 }
        : entry), sort),
    );

    try {
      const res = await fetch(`/api/feedback/${encodeURIComponent(item.id)}/vote`, { method: 'POST' });
      const data = await res.json().catch(() => null) as { item?: FeedbackItem; error?: string } | null;
      if (!res.ok || !data?.item) throw new Error(data?.error || 'Failed to vote');
      setItems((current) => sortFeedback(current.map((entry) => entry.id === item.id ? data.item! : entry), sort));
    } catch (err) {
      setItems((current) =>
        sortFeedback(current.map((entry) => entry.id === item.id
          ? { ...entry, hasVoted: false, votesCount: Math.max(0, entry.votesCount - 1) }
          : entry), sort),
      );
      setError(err instanceof Error ? err.message : 'Failed to vote');
    }
  }

  const remaining = Math.max(0, 500 - body.length);

  return (
    <div className="grid min-w-0 gap-10 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] xl:gap-16">
      <section className="min-w-0 xl:sticky xl:top-10 xl:h-fit">
        <div className="min-w-0">
          <Link
            href="/"
            className="inline-flex max-w-full min-h-11 items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft size={16} strokeWidth={1.7} className="shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">Back to Index</span>
          </Link>
        </div>
        <div className="pt-[0.02em]">
          <h1 className="text-dynamic mt-3 max-w-2xl text-4xl font-black leading-[0.94] tracking-[-0.05em] text-balance sm:text-5xl md:text-6xl xl:text-7xl">
            What should we improve?
          </h1>
          <p className="text-dynamic mt-6 max-w-md text-base leading-7 text-muted">
            Share anonymous ideas, vote on what matters, and help decide what gets built next for NotaKPMB.
          </p>
        </div>

        <form onSubmit={submitFeedback} className="mt-8 rounded-[1.75rem] bg-sheet p-4 md:rounded-[2rem] md:p-5">
          <label htmlFor="feedback-body" className="mb-3 block text-sm font-bold text-ink">
            Suggest an improvement
          </label>
          <textarea
            id="feedback-body"
            value={body}
            onChange={(event) => setBody(event.target.value.slice(0, 500))}
            placeholder="e.g. Add dark mode, group notes by semester, support more file types..."
            className="min-h-36 w-full resize-none rounded-3xl border border-line bg-white px-4 py-4 text-base leading-6 text-ink outline-none transition-colors placeholder:text-muted/50 focus:border-ink"
          />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-medium text-muted">Anonymous · {remaining} characters left</span>
            <button
              type="submit"
              disabled={body.trim().length < 4 || isPending}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-paper transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <MessageSquarePlus size={16} strokeWidth={1.7} />}
              Submit anonymously
            </button>
          </div>
          {submitError && <p className="mt-3 text-sm text-red-600">{submitError}</p>}
        </form>
      </section>

      <section className="min-w-0 xl:pt-2">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight text-ink">Public board</h2>
            <p className="mt-1 text-sm text-muted">Most-voted ideas rise to the top.</p>
          </div>
          <div className="flex min-w-0 flex-wrap gap-2">
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as FeedbackSort)}
              className="min-h-11 rounded-2xl border border-line bg-white px-4 py-2 text-sm font-semibold text-ink outline-none focus:border-ink"
              aria-label="Sort feedback"
            >
              <option value="popular">Popular</option>
              <option value="newest">Newest</option>
            </select>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as StatusFilter)}
              className="min-h-11 rounded-2xl border border-line bg-white px-4 py-2 text-sm font-semibold text-ink outline-none focus:border-ink"
              aria-label="Filter feedback status"
            >
              <option value="all">All status</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && <SearchResultsSkeleton />}
        {error && !loading && (
          <div className="rounded-[1.75rem] bg-sheet px-6 py-10 text-center md:px-10">
            <p className="text-xl font-semibold tracking-tight text-ink">Couldn&apos;t load feedback</p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">{error}</p>
          </div>
        )}
        {!loading && !error && items.length === 0 && (
          <EmptyState title="No ideas yet" hint="Be the first to suggest an improvement for NotaKPMB." />
        )}
        {!loading && !error && items.length > 0 && (
          <div className="divide-y divide-line/70">
            {items.map((item) => (
              <article key={item.id} className="grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] gap-3 rounded-[1.5rem] px-2 py-5 transition-colors hover:bg-soft md:gap-5 md:rounded-[2rem] md:px-4 md:py-6">
                <button
                  type="button"
                  onClick={() => vote(item)}
                  disabled={item.hasVoted}
                  aria-label={item.hasVoted ? 'Already voted' : 'Upvote feedback'}
                  className={`flex min-h-16 flex-col items-center justify-center rounded-2xl border px-3 py-2 text-sm font-black transition-colors ${
                    item.hasVoted
                      ? 'border-accent bg-accent text-white'
                      : 'border-line bg-white text-ink hover:border-ink'
                  }`}
                >
                  <ArrowUp size={16} strokeWidth={2} />
                  <span className="mt-1 tabular-nums">{item.votesCount}</span>
                </button>
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <StatusBadge status={item.status} />
                    {item.hasVoted && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sheet px-2.5 py-1 text-xs font-semibold text-muted">
                        <CheckCircle2 size={13} strokeWidth={1.8} /> Voted
                      </span>
                    )}
                  </div>
                  <p className="text-dynamic text-lg font-black leading-tight tracking-tight text-ink md:text-xl">
                    {item.body}
                  </p>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted">
                    <Clock3 size={13} strokeWidth={1.7} aria-hidden="true" />
                    Anonymous · {formatDate(item.createdAt)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: FeedbackStatus }) {
  const official = status !== 'open';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[status]}`}>
      {official && <Sparkles size={13} strokeWidth={1.8} aria-hidden="true" />}
      {STATUS_LABELS[status]}
    </span>
  );
}

function sortFeedback(items: FeedbackItem[], sort: FeedbackSort) {
  return items.slice().sort((a, b) => {
    if (sort === 'newest') return Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.votesCount - a.votesCount;
    return b.votesCount - a.votesCount || Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
