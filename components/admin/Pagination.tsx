'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export const ADMIN_PAGE_SIZE = 30;

function pageNumbers(page: number, totalPages: number): (number | '…')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const window = new Set([1, 2, page - 1, page, page + 1, totalPages - 1, totalPages]);
  const sorted = [...window].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (n - prev > 1) out.push('…');
    out.push(n);
    prev = n;
  }
  return out;
}

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null;
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <nav aria-label="List pages" className="flex min-w-0 flex-wrap items-center justify-center gap-2 pt-2">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={prevDisabled}
        aria-label="Previous page"
        className="inline-flex min-h-11 items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-sheet disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={16} strokeWidth={2} />
        <span className="hidden sm:inline">Previous</span>
      </button>

      {pageNumbers(page, totalPages).map((n, i) =>
        n === '…' ? (
          <span key={`gap-${i}`} aria-hidden="true" className="px-1 text-sm font-bold text-muted">…</span>
        ) : (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`Page ${n}`}
            aria-current={n === page ? 'page' : undefined}
            className={`inline-flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors ${
              n === page ? 'bg-ink text-paper' : 'bg-white text-ink hover:bg-sheet'
            }`}
          >
            {n}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={nextDisabled}
        aria-label="Next page"
        className="inline-flex min-h-11 items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-sheet disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight size={16} strokeWidth={2} />
      </button>
    </nav>
  );
}
