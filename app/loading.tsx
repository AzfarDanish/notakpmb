import { ProgrammeListSkeleton } from '@/components/Skeleton'

export default function Loading() {
  return (
    <main id="main" className="page-shell py-6 md:py-12 xl:py-14">
      <div className="grid min-w-0 gap-10 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:gap-16">
        <section className="min-w-0">
          <div className="h-8 w-32 rounded-full bg-line/70 motion-safe:animate-pulse" />
          <div className="mt-8 space-y-5 md:mt-12 xl:mt-16">
            <div className="h-20 max-w-xl rounded-[2rem] bg-line/70 motion-safe:animate-pulse sm:h-24 md:h-32" />
            <div className="h-5 max-w-md rounded-full bg-line/70 motion-safe:animate-pulse" />
            <div className="h-5 max-w-xs rounded-full bg-line/70 motion-safe:animate-pulse" />
          </div>
          <div className="mt-8 h-28 max-w-xl rounded-[1.75rem] bg-sheet motion-safe:animate-pulse md:rounded-[2rem]" />
        </section>
        <section className="min-w-0 xl:pt-8">
          <ProgrammeListSkeleton />
        </section>
      </div>
    </main>
  )
}
