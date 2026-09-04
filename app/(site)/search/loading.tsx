import { Breadcrumbs } from '@/components/Breadcrumbs'
import { SearchResultsSkeleton, Skeleton } from '@/components/Skeleton'

export default function Loading() {
  return (
    <main id="main" className="page-shell py-6 md:py-12 xl:py-14">
      <Breadcrumbs items={[{ label: 'Index', href: '/' }, { label: 'Search' }]} />
      <div className="mt-8 grid min-w-0 gap-8 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:gap-14">
        <section className="min-w-0 space-y-6">
          <Skeleton className="h-20 max-w-xl rounded-[2rem] md:h-28" />
          <Skeleton className="h-5 max-w-md" />
          <div className="h-24 rounded-[1.75rem] bg-sheet md:rounded-[2rem]" />
        </section>
        <section className="min-w-0 xl:pt-2">
          <SearchResultsSkeleton />
        </section>
      </div>
    </main>
  )
}
