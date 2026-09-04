import Link from 'next/link'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { getAllCourses } from '@/lib/courses'
import { getProgrammes } from '@/lib/subjects'
import { CourseLookup } from '@/components/CourseLookup'
import { CourseGroupsSkeleton } from '@/components/Skeleton'

export const metadata: Metadata = {
  title: 'Courses - Browse all subjects & codes',
  description: 'Type a subject name and instantly see its course code. All 36 KPMB courses stored in the cloud, searchable by title or code.',
}

async function CoursesTotal() {
  const catalog = await getAllCourses()
  return <>{catalog.length}</>
}

async function CourseGroups() {
  const [catalog, programmes] = await Promise.all([getAllCourses(), getProgrammes()])
  // Group catalog courses by programme for browsing (catalog is source of truth, not ledger)
  const catalogByProgramme = new Map<string, typeof catalog>()
  for (const c of catalog) {
    const arr = catalogByProgramme.get(c.programmeId) ?? []
    arr.push(c)
    catalogByProgramme.set(c.programmeId, arr)
  }
  const programmesWithCatalog = programmes.map((p) => ({
    ...p,
    subjects: (catalogByProgramme.get(p.id) ?? [])
      .map((c) => ({ id: c.id, title: c.title, code: c.code }))
      .sort((a, b) => a.code.localeCompare(b.code)),
  }))

  return (
    <section className="min-w-0 xl:pt-2">
      {programmesWithCatalog.map((programme) => (
            <div key={programme.id} className="border-t border-line py-7 first:border-t-0 first:pt-0">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-dynamic text-sm font-bold text-accent">{programme.code}</p>
                  <h2 className="text-dynamic mt-1 text-xl font-black tracking-tight text-ink sm:text-2xl md:text-3xl">{programme.title}</h2>
                  <p className="text-dynamic mt-2 max-w-xl text-sm leading-6 text-muted">{programme.description}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-muted">{programme.subjects.length}</span>
              </div>

              {programme.subjects.length === 0 ? (
                <p className="rounded-2xl bg-sheet px-4 py-6 text-center text-sm text-muted">No subjects yet.</p>
              ) : (
                <div className="divide-y divide-line/70">
                  {programme.subjects
                    .slice()
                    .sort((a, b) => a.code.localeCompare(b.code))
                    .map((subject) => (
                      <Link
                        key={subject.id}
                        href={`/subject/${subject.id}`}
                        className="group flex min-w-0 items-center justify-between gap-4 rounded-2xl px-2 py-3.5 transition-colors hover:bg-soft md:px-4 md:py-4"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="text-dynamic block text-xs font-bold text-accent">{subject.code}</span>
                          <span className="text-dynamic mt-0.5 block font-semibold leading-tight text-ink">{subject.title}</span>
                        </span>
                        <ArrowRight size={18} strokeWidth={1.7} className="shrink-0 text-muted/50 transition-transform group-hover:translate-x-1 group-hover:text-ink" />
                      </Link>
                    ))}
                </div>
              )}
            </div>
      ))}
    </section>
  )
}

export default function CoursesPage() {
  return (
    <main id="main" className="page-shell">
      <div className="min-w-0">
        <Link
          href="/"
          className="inline-flex max-w-full min-h-11 items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft size={16} strokeWidth={1.7} className="shrink-0" aria-hidden="true" />
          <span className="min-w-0 truncate">Back to Index</span>
        </Link>
      </div>

      <div className="mt-8 grid min-w-0 gap-8 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:gap-14">
        <section className="min-w-0">
          <h1 className="text-dynamic max-w-xl text-4xl font-black leading-[0.94] tracking-[-0.05em] text-balance sm:text-5xl md:text-6xl xl:text-7xl">
            Know the code. Open the files.
          </h1>
          <p className="text-dynamic mt-6 max-w-md text-base leading-7 text-muted">
            Search <Suspense fallback="live"> <CoursesTotal /></Suspense> courses by name or code. Pick a result to open its notes.
          </p>

          <div className="mt-8 rounded-[1.75rem] bg-sheet p-3 md:rounded-[2rem] md:p-4">
            <CourseLookup size="lg" placeholder="Course name or code" />
            <p className="mt-3 px-1 text-sm text-muted">
              Results come from the cloud catalog. Press Enter on a selected result to open it.
            </p>
          </div>
        </section>

        <Suspense fallback={<section className="min-w-0 xl:pt-2"><CourseGroupsSkeleton /></section>}>
          <CourseGroups />
        </Suspense>
      </div>
    </main>
  )
}
