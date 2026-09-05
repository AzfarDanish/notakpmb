'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { AdminEmpty, AdminError, StatCard, StatsSkeleton } from '@/components/admin/ui';
import type { FeedbackItem } from '@/lib/feedback';
import type { ActivityItem } from '@/lib/admin';

type Stats = {
  programmes: number; subjects: number; files: number; feedback: number; votes: number;
  recentFeedback: FeedbackItem[];
  recentActivity: ActivityItem[];
  recentUploads: { key: string; subjectId: string }[];
};

export function DashboardClient() {
  const [data, setData] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/stats');
      if (res.status === 403) throw new Error('Not authorized');
      if (!res.ok) throw new Error('Failed to load dashboard');
      setData((await res.json()) as Stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <StatsSkeleton />;
  if (error) return <AdminError message={error} onRetry={load} />;
  if (!data) return <AdminEmpty title="No data" hint="Stats are unavailable right now." />;

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Programmes" value={data.programmes} />
        <StatCard label="Subjects" value={data.subjects} />
        <StatCard label="Files" value={data.files} />
        <StatCard label="Feedback" value={data.feedback} />
        <StatCard label="Votes" value={data.votes} />
      </div>

      <div className="grid min-w-0 gap-8 xl:grid-cols-3">
        <section className="min-w-0 rounded-[1.75rem] bg-sheet p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black tracking-tight text-ink">Recent feedback</h2>
            <Link href="/admin/feedback" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">Open <ArrowRight size={14} /></Link>
          </div>
          <div className="mt-3 divide-y divide-line/70">
            {data.recentFeedback.length === 0 && <p className="py-4 text-sm text-muted">No feedback yet.</p>}
            {data.recentFeedback.map((f) => (
              <div key={f.id} className="min-w-0 py-3">
                <p className="truncate text-sm font-semibold text-ink">{f.body}</p>
                <p className="mt-1 font-mono text-xs text-muted">{f.status} · {f.votesCount} votes</p>
              </div>
            ))}
          </div>
        </section>

        <section className="min-w-0 rounded-[1.75rem] bg-sheet p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black tracking-tight text-ink">Recent uploads</h2>
            <Link href="/admin/files" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">Open <ArrowRight size={14} /></Link>
          </div>
          <div className="mt-3 divide-y divide-line/70">
            {data.recentUploads.length === 0 && <p className="py-4 text-sm text-muted">No indexed uploads yet. Files are listed live from storage.</p>}
            {data.recentUploads.map((f) => (
              <div key={f.key} className="min-w-0 py-3">
                <p className="truncate font-mono text-xs text-ink">{f.key}</p>
                <p className="mt-1 text-xs text-muted">{f.subjectId}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="min-w-0 rounded-[1.75rem] bg-sheet p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black tracking-tight text-ink">Recent activity</h2>
            <Link href="/admin/activity" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">Open <ArrowRight size={14} /></Link>
          </div>
          <div className="mt-3 divide-y divide-line/70">
            {data.recentActivity.length === 0 && <p className="py-4 text-sm text-muted">No admin activity recorded yet.</p>}
            {data.recentActivity.map((a) => (
              <div key={a.id} className="min-w-0 py-3">
                <p className="truncate text-sm font-semibold text-ink">{a.action}</p>
                <p className="mt-1 truncate font-mono text-xs text-muted">{a.entityType} {a.entityId}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
