'use client';

import { useCallback, useEffect, useState } from 'react';
import { StatsSkeleton } from '@/components/admin/ui';
import { AdminError } from '@/components/admin/ui';

type Check = { ok: boolean; latencyMs: number; detail: string };

export function HealthClient() {
  const [data, setData] = useState<{ app: Check; database: Check; storage: Check; processing: Check; recentFailures: { id: string; action: string; meta: string; createdAt: string }[] } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/health');
      if (res.status === 403) throw new Error('Not authorized');
      if (!res.ok) throw new Error('Health check failed');
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Health check failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <StatsSkeleton />;
  if (error) return <AdminError message={error} onRetry={load} />;
  if (!data) return null;

  const cards: [string, Check][] = [
    ['Application / API', data.app],
    ['Database (D1)', data.database],
    ['Storage (R2)', data.storage],
    ['Processing', data.processing],
  ];

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, c]) => (
          <div key={label} className="min-w-0 rounded-[1.75rem] bg-sheet p-4 md:p-5">
            <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${c.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <span className={`h-2 w-2 rounded-full ${c.ok ? 'bg-green-600' : 'bg-red-600'}`} />
              {c.ok ? 'Healthy' : 'Down'}
            </p>
            <p className="mt-3 text-lg font-black text-ink">{label}</p>
            <p className="mt-1 text-sm text-muted">{c.detail}</p>
            <p className="mt-1 font-mono text-xs text-muted">{c.latencyMs}ms</p>
          </div>
        ))}
      </div>
      <section className="min-w-0 rounded-[1.75rem] bg-sheet p-4 md:p-5">
        <h2 className="text-xl font-black text-ink">Recent failures</h2>
        {data.recentFailures.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No failures recorded.</p>
        ) : (
          <div className="mt-2 divide-y divide-line/70">
            {data.recentFailures.map((f) => (
              <div key={f.id} className="py-3">
                <p className="font-mono text-xs font-bold text-ink">{f.action}</p>
                <p className="mt-1 truncate text-xs text-muted">{f.meta}</p>
                <p className="text-xs text-muted">{f.createdAt}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
