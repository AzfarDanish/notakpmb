import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { searchArchiveWithCustom } from '@/lib/subjects';
import { CourseLookup } from '@/components/CourseLookup';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { EmptyState } from '@/components/EmptyState';

export const metadata: Metadata = {
  title: 'Search the Archive',
  robots: {
    index: false,
    follow: true,
  },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  const results = query ? await searchArchiveWithCustom(query) : null;

  return (
    <main id="main" className="page-shell py-8 md:py-14">
      <Breadcrumbs items={[{ label: 'Index', href: '/' }, { label: 'Search' }]} />

      <div className="mt-10 grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <section>
          <h1 className="max-w-xl text-5xl font-black leading-[0.9] tracking-[-0.06em] text-balance md:text-7xl">
            Search courses.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-muted">
            Type a course name or code. Results appear as you type from the live catalog.
          </p>
          <div className="mt-8 rounded-[2rem] bg-sheet p-3 md:p-4">
            <CourseLookup size="lg" autoFocus placeholder="Course name or code" />
          </div>
        </section>

        <section className="lg:pt-2">
          {!query && (
            <div className="rounded-[2rem] bg-soft p-8">
              <p className="text-2xl font-black tracking-tight text-ink">Start with a word you remember.</p>
              <p className="mt-3 max-w-md text-sm leading-6 text-muted">
                Try “database”, “CSC 1413”, or the filename your lecturer shared.
              </p>
            </div>
          )}

          {query && results &&
            results.programmes.length === 0 &&
            results.subjects.length === 0 && (
            <EmptyState
              title={`No results for "${query}"`}
              hint="Try a shorter course name or a code such as CSC 1413."
            />
          )}

          {query && results && results.programmes.length > 0 && (
            <section className="mb-12">
              <h2 className="mb-4 text-xl font-black tracking-tight text-ink">Programmes</h2>
              <div className="divide-y divide-line/70">
                {results.programmes.map((programme) => (
                  <Link
                    key={programme.id}
                    href={`/programme/${programme.id}`}
                    className="group flex items-center justify-between gap-4 py-4 transition-colors hover:px-4 hover:bg-soft"
                  >
                    <span>
                      <span className="block text-xs font-bold text-accent">{programme.code}</span>
                      <span className="mt-1 block text-xl font-black tracking-tight text-ink">
                        {programme.title}
                      </span>
                    </span>
                    <ArrowRight size={18} className="text-muted/50 transition-transform group-hover:translate-x-1 group-hover:text-ink" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {query && results && results.subjects.length > 0 && (
            <section className="mb-12">
              <h2 className="mb-4 text-xl font-black tracking-tight text-ink">Subjects</h2>
              <div className="divide-y divide-line/70">
                {results.subjects.map(({ subject, programme }) => (
                  <Link
                    key={subject.id}
                    href={`/subject/${subject.id}`}
                    className="group flex items-center justify-between gap-4 py-4 transition-colors hover:px-4 hover:bg-soft"
                  >
                    <span>
                      <span className="block text-xl font-black tracking-tight text-ink">
                        {subject.title}
                      </span>
                      <span className="mt-1 block text-sm text-muted">
                        {subject.code} · {programme.code}
                      </span>
                    </span>
                    <ArrowRight size={18} className="text-muted/50 transition-transform group-hover:translate-x-1 group-hover:text-ink" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
