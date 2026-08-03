import Link from 'next/link';
import { searchArchiveWithCustom, getSubjectWithCustom } from '@/lib/subjects';
import { searchFiles } from '@/lib/r2';
import { SearchInput } from '@/components/SearchInput';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { EmptyState } from '@/components/EmptyState';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  const results = query ? await searchArchiveWithCustom(query) : null;
  const files = query ? await searchFiles(query) : null;

  const fileContexts = files?.length
    ? await Promise.all(
        files.map(async (file) => ({
          file,
          context: await getSubjectWithCustom(file.subjectId),
        })),
      )
    : [];

  const visibleFiles = fileContexts.filter(
    (entry): entry is typeof entry & { context: NonNullable<typeof entry.context> } =>
      Boolean(entry.context),
  );

  return (
    <main id="main" className="max-w-7xl mx-auto px-6 py-12 md:py-16 md:px-12">
      <Breadcrumbs items={[{ label: 'Index', href: '/' }, { label: 'Search' }]} />

      <div className="mt-8 md:mt-12 max-w-2xl">
        <h1 className="font-serif text-5xl md:text-7xl font-bold tracking-tight">
          Search
        </h1>
        <div className="mt-8">
          <SearchInput size="lg" autoFocus />
        </div>
      </div>

      <div className="mt-12 md:mt-20 max-w-3xl">
        {!query && (
          <p className="text-sm text-neutral-500">
            Search by subject title, course code, or file name — for
            example &ldquo;database&rdquo; or &ldquo;CSC 1413&rdquo;. Can&rsquo;t find
            a topic? Be the first to contribute it.
          </p>
        )}

        {query && results && files &&
          results.programmes.length === 0 &&
          results.subjects.length === 0 &&
          files.length === 0 && (
          <EmptyState
            title={`No results for "${query}"`}
            hint="It might not exist yet. You could be the one to start it."
          />
        )}

        {query && results && results.programmes.length > 0 && (
          <section className="mb-14">
            <h2 className="text-[10px] tracking-widest text-neutral-400 uppercase font-medium mb-6 md:mb-8 border-b border-neutral-200 pb-4">
              Programmes
            </h2>
            <div className="flex flex-col gap-6 md:gap-8">
              {results.programmes.map((programme) => (
                <Link
                  key={programme.id}
                  href={`/programme/${programme.id}`}
                  className="group"
                >
                  <p className="text-[10px] tracking-widest text-accent uppercase font-bold">
                    {programme.code}
                  </p>
                  <h3 className="font-serif text-2xl md:text-3xl font-bold group-hover:opacity-60 transition-opacity">
                    {programme.title}
                  </h3>
                </Link>
              ))}
            </div>
          </section>
        )}

        {query && results && results.subjects.length > 0 && (
          <section>
            <h2 className="text-[10px] tracking-widest text-neutral-400 uppercase font-medium mb-6 md:mb-8 border-b border-neutral-200 pb-4">
              Subjects
            </h2>
            <div className="flex flex-col gap-6 md:gap-8">
              {results.subjects.map(({ subject, programme }) => (
                <Link
                  key={subject.id}
                  href={`/subject/${subject.id}`}
                  className="group"
                >
                  <h3 className="font-serif text-2xl md:text-3xl font-bold group-hover:opacity-60 transition-opacity">
                    {subject.title}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    {subject.code} · {programme.code}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {visibleFiles.length > 0 && (
          <section className="mt-14">
            <h2 className="text-[10px] tracking-widest text-neutral-400 uppercase font-medium mb-6 md:mb-8 border-b border-neutral-200 pb-4">
              Files
            </h2>
            <div className="flex flex-col gap-6 md:gap-8">
              {visibleFiles.map(({ file, context }) => (
                <Link
                  key={file.key}
                  href={`/subject/${file.subjectId}`}
                  className="group"
                >
                  <h3 className="font-serif text-2xl md:text-3xl font-bold group-hover:opacity-60 transition-opacity">
                    {file.title}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    {file.originalName} · {context.subject.title} ·{' '}
                    {context.programme.code}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
