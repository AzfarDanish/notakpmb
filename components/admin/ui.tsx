'use client';

import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-[1.75rem] bg-sheet p-4 md:p-5">
      <p className="text-3xl font-black tracking-tight text-ink tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-5" aria-busy="true" aria-label="Loading stats">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-[1.75rem] bg-sheet p-4">
          <Skeleton className="h-10 w-16" />
          <Skeleton className="mt-2 h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

export function AdminEmpty({ title, hint }: { title: string; hint: string }) {
  return <EmptyState title={title} hint={hint} />;
}

export function AdminError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-[1.75rem] bg-sheet px-6 py-10 text-center">
      <p className="text-xl font-semibold tracking-tight text-ink">Couldn&apos;t load</p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-5 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-paper transition-colors hover:bg-accent">
          Try again
        </button>
      )}
    </div>
  );
}
