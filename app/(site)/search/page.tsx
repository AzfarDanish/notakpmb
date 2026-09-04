import Link from 'next/link';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ArrowRight } from 'lucide-react';
import { searchArchiveWithCustom } from '@/lib/subjects';
import { CourseLookup } from '@/components/CourseLookup';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { EmptyState } from '@/components/EmptyState';
import { SearchResultsSkeleton } from '@/components/Skeleton';

export const metadata: Metadata = {
  title: 'Search the Archive',
  robots: {
    index: false,
    follow: true,
  },
};

async function SearchResults({ query }: { query: string }) {
  const results = await searchArchiveWithCustom(query);

  if (results.programmes.length === 0 && results.subjects.length === 0) {
    return (
      <EmptyState
        title={`No results for "${query}"`}
        hint="Try a shorter course name or a code such as CSC 1413."
      />
    );
  }

  return (
    <>
      {results.programmes.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 text-xl font-black tracking-tight text-ink">Programmes</h2>
          <div className="divide-y divide-line/70">
            {results.programmes.map((programme) => (
              <Link
                key={programme.id}
                href={`/programme/${programme.id}`}
                className="group flex min-w-0 items-center justify-between gap-4 rounded-2xl px-2 py-4 transition-colors hover:bg-soft md:px-4"
              >
                <span className="min-w-0 flex-1">
                  <span className="text-dynamic block text-xs font-bold text-accent">{programme.code}</span>
                  <span className="text-dynamic mt-1 block text-xl font-black tracking-tight text-ink">
                    {programme.title}
                  </span>
                </span>
                <ArrowRight size={18} className="shrink-0 text-muted/50 transition-transform group-hover:translate-x-1 group-hover:text-ink" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {results.subjects.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 text-xl font-black tracking-tight text-ink">Subjects</h2>
          <div className="divide-y divide-line/70">
            {results.subjects.map(({ subject, programme }) => (
              <Link
                key={subject.id}
                href={`/subject/${subject.id}`}
                className="group flex min-w-0 items-center justify-between gap-4 rounded-2xl px-2 py-4 transition-colors hover:bg-soft md:px-4"
              >
                <span className="min-w-0 flex-1">
                  <span className="text-dynamic block text-xl font-black tracking-tight text-ink">
                    {subject.title}
                  </span>
                  <span className="text-dynamic mt-1 block text-sm text-muted">
                    {subject.code} · {programme.code}
                  </span>
                </span>
                <ArrowRight size={18} className="shrink-0 text-muted/50 transition-transform group-hover:translate-x-1 group-hover:text-ink" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  return (
    <main id="main" className="page-shell py-6 md:py-12 xl:py-14">
      <Breadcrumbs items={[{ label: 'Index', href: '/' }, { label: 'Search' }]} />

      <div className="mt-8 grid min-w-0 gap-8 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:gap-14">
        <section className="min-w-0">
          <h1 className="text-dynamic max-w-xl text-4xl font-black leading-[0.94] tracking-[-0.05em] text-balance sm:text-5xl md:text-6xl xl:text-7xl">
            Search courses.
          </h1>
          <p className="text-dynamic mt-6 max-w-md text-base leading-7 text-muted">
            Type a course name or code. Results appear as you type from the live catalog.
          </p>
          <div className="mt-8 rounded-[1.75rem] bg-sheet p-3 md:rounded-[2rem] md:p-4">
            <CourseLookup size="lg" placeholder="Course name or code" />
          </div>
        </section>

        <section className="min-w-0 xl:pt-2">
          {!query && (
            <div className="rounded-[1.75rem] bg-soft p-6 md:rounded-[2rem] md:p-8">
              <p className="text-2xl font-black tracking-tight text-ink">Start with a word you remember.</p>
              <p className="mt-3 max-w-md text-sm leading-6 text-muted">
                Try “database”, “CSC 1413”, or the filename your lecturer shared.
              </p>
            </div>
          )}

          {query && (
            <Suspense key={query} fallback={<SearchResultsSkeleton />}>
              <SearchResults query={query} />
            </Suspense>
          )}
        </section>
      </div>
    </main>
  );
}
