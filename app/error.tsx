'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main" className="page-shell">
      <div className="rounded-[1.75rem] bg-sheet px-6 py-10 text-center md:px-10">
        <p className="text-xl font-semibold tracking-tight text-ink">Something didn&apos;t load</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">
          {error?.message || 'Check your connection and try again.'}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-paper transition-colors hover:bg-accent"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
