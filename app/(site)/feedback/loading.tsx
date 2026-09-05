import { SearchResultsSkeleton, Skeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <main id="main" className="page-shell">
      <div className="grid min-w-0 gap-10 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] xl:gap-16">
        <section className="min-w-0 space-y-6">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-28 max-w-xl rounded-[2rem] md:h-36" />
          <Skeleton className="h-5 max-w-md" />
          <div className="h-72 rounded-[1.75rem] bg-sheet md:rounded-[2rem]" />
        </section>
        <section className="min-w-0 xl:pt-2">
          <SearchResultsSkeleton />
        </section>
      </div>
    </main>
  );
}
