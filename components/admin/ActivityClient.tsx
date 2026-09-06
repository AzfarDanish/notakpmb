'use client';

import { useCallback, useEffect, useState } from 'react';
import { SearchResultsSkeleton } from '@/components/Skeleton';
import { AdminEmpty, AdminError } from '@/components/admin/ui';
import type { ActivityItem } from '@/lib/admin';

export function ActivityClient() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/activity?limit=50');
      if (res.status === 403) throw new Error('Not authorized');
      if (!res.ok) throw new Error('Failed to load activity');
      setItems(((await res.json()) as { items: ActivityItem[] }).items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <SearchResultsSkeleton />;
  if (error) return <AdminError message={error} onRetry={load} />;
  if (items.length === 0) return <AdminEmpty title="No activity" hint="Admin actions will appear here." />;

  return (
    <div
      aria-label="Recent activity, newest first"
      className="max-h-[32rem] min-w-0 divide-y divide-line/70 overflow-y-auto rounded-[1.75rem] bg-sheet px-3 py-1 md:max-h-[36rem]"
    >
      {items.map((a) => (
        <div key={a.id} className="min-w-0 rounded-2xl px-2 py-4 md:px-4">
          <p className="truncate text-sm font-bold text-ink">{a.action}</p>
          <p className="mt-1 truncate font-mono text-xs text-muted">{a.entityType} {a.entityId}</p>
          {a.meta && <p className="text-dynamic mt-1 truncate text-xs text-muted">{a.meta}</p>}
          <p className="mt-1 text-xs text-muted">{a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}</p>
        </div>
      ))}
    </div>
  );
}
