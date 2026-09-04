import { Breadcrumbs } from '@/components/Breadcrumbs'
import { FileListSkeleton, Skeleton } from '@/components/Skeleton'

export default function Loading() {
  return (
    <main id="main" className="page-shell">
      <Breadcrumbs items={[{ label: 'Index', href: '/' }, { label: 'Subject' }]} />
      <div className="mt-8 grid min-w-0 gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] xl:gap-14">
        <section className="min-w-0 space-y-5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-24 max-w-xl rounded-[2rem] md:h-32" />
          <Skeleton className="h-5 max-w-md" />
          <div className="mt-6 min-w-0 rounded-[1.75rem] bg-sheet p-4 md:rounded-[2rem] md:p-5">
            <Skeleton className="h-10 w-12" />
            <Skeleton className="mt-2 h-4 w-24" />
            <Skeleton className="mt-5 h-12 w-full rounded-2xl" />
          </div>
        </section>
        <FileListSkeleton />
      </div>
    </main>
  )
}
