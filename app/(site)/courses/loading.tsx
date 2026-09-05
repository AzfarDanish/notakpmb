import { CourseGroupsSkeleton, Skeleton } from '@/components/Skeleton'

export default function Loading() {
  return (
    <main id="main" className="page-shell">
      <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:gap-14">
        <section className="min-w-0 space-y-6">
          <Skeleton className="h-24 max-w-xl rounded-[2rem] md:h-32" />
          <Skeleton className="h-5 max-w-md" />
          <div className="h-32 rounded-[1.75rem] bg-sheet md:rounded-[2rem]" />
        </section>
        <section className="min-w-0 xl:pt-2">
          <CourseGroupsSkeleton />
        </section>
      </div>
    </main>
  )
}
