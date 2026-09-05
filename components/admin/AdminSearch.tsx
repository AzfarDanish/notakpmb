'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { LookupResultsSkeleton } from '@/components/Skeleton';

type Group = { id: string; title: string; code: string; href: string };

export function AdminSearch() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ programmes: Group[]; subjects: Group[]; files: Group[]; feedback: Group[] } | null>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setResult(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error('search failed');
        setResult((await res.json()) as typeof result & {});
      } catch {
        if (!ctrl.signal.aborted) setResult(null);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [q]);

  const hasAny = result && (result.programmes.length + result.subjects.length + result.files.length + result.feedback.length > 0);

  return (
    <div className="min-w-0 rounded-[1.75rem] bg-sheet p-3 md:p-4">
      <div className="relative">
        <Search size={16} strokeWidth={1.5} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search programmes, subjects, files, feedback…"
          className="w-full rounded-2xl border border-line bg-white py-3 pl-11 pr-4 text-base outline-none placeholder:text-muted/60 focus:border-ink md:text-sm"
        />
      </div>
      {loading && (
        <div className="mt-3 rounded-2xl bg-white p-2"><LookupResultsSkeleton /></div>
      )}
      {!loading && result && !hasAny && q.trim().length >= 2 && (
        <p className="px-2 py-3 text-sm text-muted">No admin results for “{q.trim()}”.</p>
      )}
      {!loading && result && hasAny && (
        <div className="mt-3 grid min-w-0 gap-3 rounded-2xl bg-white p-3 sm:grid-cols-2 xl:grid-cols-4">
          {(
            [
              ['Programmes', result.programmes],
              ['Subjects', result.subjects],
              ['Files', result.files],
              ['Feedback', result.feedback],
            ] as [string, Group[]][]
          ).map(([label, items]) => (
            <div key={label} className="min-w-0">
              <p className="px-1 text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
              <div className="mt-1 divide-y divide-line/60">
                {items.length === 0 && <p className="px-1 py-2 text-xs text-muted">—</p>}
                {items.map((it) => (
                  <Link key={`${label}-${it.id}`} href={it.href} className="block min-w-0 px-1 py-2 transition-colors hover:bg-soft">
                    <span className="block truncate text-sm font-semibold text-ink">{it.title}</span>
                    <span className="block truncate font-mono text-xs text-muted">{it.code || it.id}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
