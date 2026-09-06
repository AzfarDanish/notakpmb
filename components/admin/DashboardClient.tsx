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

type Check = { ok: boolean; latencyMs: number; detail: string };

type Health = {
  app: Check; database: Check; storage: Check; processing: Check;
  recentFailures: { id: string; action: string; meta: string; createdAt: string }[];
};

export function DashboardClient() {
  const [data, setData] = useState<Stats | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setHealthError('');
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
    try {
      const res = await fetch('/api/admin/health');
      if (!res.ok) throw new Error('Health check failed');
      setHealth((await res.json()) as Health);
    } catch (e) {
      setHealthError(e instanceof Error ? e.message : 'Health check failed');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <StatsSkeleton />;
  if (error) return <AdminError message={error} onRetry={load} />;
  if (!data) return <AdminEmpty title="No data" hint="Stats are unavailable right now." />;

  const checks: [string, Check][] = health
    ? [
        ['Application / API', health.app],
        ['Database', health.database],
        ['Storage (R2)', health.storage],
        ['Processing', health.processing],
      ]
    : [];

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
                <p className="mt-1 font-mono text-xs text-muted">{f.votesCount} votes</p>
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

      <section aria-label="System health" className="min-w-0 rounded-[1.75rem] bg-sheet p-4 md:p-5">
        <h2 className="text-xl font-black tracking-tight text-ink">System Health</h2>
        {healthError && !health && (
          <p className="mt-3 text-sm text-muted">Health status unavailable: {healthError}</p>
        )}
        {health && (
          <>
            <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {checks.map(([label, c]) => (
                <div key={label} className="min-w-0 rounded-2xl bg-white px-4 py-3">
                  <p className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-bold ${c.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${c.ok ? 'bg-green-600' : 'bg-red-600'}`} />
                    {c.ok ? 'Healthy' : 'Down'}
                  </p>
                  <p className="mt-2 truncate text-sm font-bold text-ink">{label}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">{c.detail} · {c.latencyMs}ms</p>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-2xl bg-white px-4 py-3">
              <p className="text-sm font-bold text-ink">
                Recent failures{' '}
                <span className="tabular-nums text-muted">{health.recentFailures.length}</span>
              </p>
              {health.recentFailures.length === 0 ? (
                <p className="mt-1 text-xs text-muted">No failures recorded.</p>
              ) : (
                <div className="mt-1 divide-y divide-line/60">
                  {health.recentFailures.slice(0, 3).map((f) => (
                    <div key={f.id} className="min-w-0 py-2">
                      <p className="truncate font-mono text-xs font-bold text-ink">{f.action}</p>
                      <p className="truncate text-xs text-muted">{f.meta}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
