import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Skeleton, StatsSkeleton, SubjectListSkeleton } from '@/components/Skeleton'

export default function Loading() {
  return (
    <main id="main" className="page-shell">
      <Breadcrumbs items={[{ label: 'Index', href: '/' }, { label: 'Programme' }]} />
      <section className="mt-8 grid min-w-0 gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:gap-14">
        <div className="min-w-0 space-y-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-24 max-w-4xl rounded-[2rem] md:h-32" />
          <Skeleton className="h-5 max-w-xl" />
          <Skeleton className="h-5 max-w-md" />
        </div>
        <div className="min-w-0 rounded-[1.75rem] bg-sheet p-4 md:rounded-[2rem] md:p-6 xl:self-end">
          <StatsSkeleton />
          <Skeleton className="mt-5 h-12 w-full rounded-2xl" />
        </div>
      </section>
      <section className="mt-12 md:mt-16">
        <SubjectListSkeleton />
      </section>
    </main>
  )
}
