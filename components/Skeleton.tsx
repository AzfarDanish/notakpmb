type SkeletonProps = {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={`block rounded-full bg-line/70 motion-safe:animate-pulse ${className}`}
    />
  )
}

export function ProgrammeListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex min-w-0 flex-col gap-2" aria-busy="true" aria-label="Loading programmes">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="grid min-w-0 gap-4 rounded-[1.5rem] px-3 py-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:px-4 md:gap-5 md:rounded-[2rem] md:px-5 md:py-6 xl:grid-cols-[8rem_minmax(0,1fr)_auto] xl:items-center xl:py-7"
        >
          <Skeleton className="h-4 w-24" />
          <div className="min-w-0 space-y-3">
            <Skeleton className="h-8 w-4/5 max-w-lg" />
            <Skeleton className="h-4 w-full max-w-xl" />
            <Skeleton className="h-4 w-3/5 max-w-md" />
          </div>
          <div className="flex items-center justify-between gap-4 sm:col-span-2 xl:col-span-1 xl:justify-end">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-5 shrink-0" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function CourseGroupsSkeleton({ groups = 4 }: { groups?: number }) {
  return (
    <div className="min-w-0" aria-busy="true" aria-label="Loading courses">
      {Array.from({ length: groups }).map((_, index) => (
        <div key={index} className="border-t border-line py-7 first:border-t-0 first:pt-0">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-4/5 max-w-md" />
              <Skeleton className="h-4 w-full max-w-lg" />
            </div>
            <Skeleton className="h-4 w-6 shrink-0" />
          </div>
          <div className="divide-y divide-line/70">
            {Array.from({ length: 3 }).map((_, rowIndex) => (
              <div key={rowIndex} className="flex items-center justify-between gap-4 rounded-2xl px-2 py-3.5 md:px-4 md:py-4">
                <span className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-4/5 max-w-md" />
                </span>
                <Skeleton className="h-5 w-5 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function SubjectListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-line/70" aria-busy="true" aria-label="Loading subjects">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex min-w-0 items-center gap-3 rounded-2xl px-2 py-4 sm:gap-4 md:px-4 md:py-5">
          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-baseline">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-4/5 max-w-lg" />
          </div>
          <Skeleton className="hidden h-5 w-5 shrink-0 sm:block" />
        </div>
      ))}
    </div>
  )
}

export function FileListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <section className="min-w-0" aria-busy="true" aria-label="Loading files">
      <Skeleton className="mb-6 h-6 w-16" />
      <div className="min-w-0 divide-y divide-line/70">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="flex min-w-0 items-center justify-between gap-3 rounded-2xl px-2 py-4 sm:gap-4 md:px-4 md:py-5">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-7 w-4/5 max-w-xl" />
              <Skeleton className="h-3 w-3/5 max-w-md" />
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
              <Skeleton className="hidden h-4 w-24 sm:block" />
              <Skeleton className="hidden h-4 w-16 sm:block" />
              <Skeleton className="h-11 w-11" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3" aria-busy="true" aria-label="Loading statistics">
      <div className="space-y-2">
        <Skeleton className="h-10 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-10 w-16" />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  )
}

export function SearchResultsSkeleton() {
  return (
    <div className="min-w-0 space-y-10" aria-busy="true" aria-label="Loading search results">
      <section>
        <Skeleton className="mb-4 h-6 w-28" />
        <div className="divide-y divide-line/70">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex min-w-0 items-center justify-between gap-4 rounded-2xl px-2 py-4 md:px-4">
              <span className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-4/5 max-w-lg" />
              </span>
              <Skeleton className="h-5 w-5 shrink-0" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export function LookupResultsSkeleton() {
  return (
    <div className="py-2" aria-busy="true" aria-label="Searching courses">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex min-w-0 items-start justify-between gap-3 px-4 py-3.5 sm:gap-4 sm:px-5">
          <span className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-4/5 max-w-sm" />
            <Skeleton className="h-3 w-3/5 max-w-xs" />
          </span>
          <Skeleton className="mt-2 h-4 w-4 shrink-0" />
        </div>
      ))}
    </div>
  )
}

export function PreviewSkeleton({ label = 'Loading preview' }: { label?: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6 md:p-10" aria-busy="true" aria-label={label}>
      <Skeleton className="h-5 w-32" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-10/12" />
      </div>
      <div className="mt-4 grid flex-1 min-h-40 grid-cols-3 gap-3">
        <Skeleton className="h-full rounded-2xl" />
        <Skeleton className="h-full rounded-2xl" />
        <Skeleton className="h-full rounded-2xl" />
      </div>
    </div>
  )
}
