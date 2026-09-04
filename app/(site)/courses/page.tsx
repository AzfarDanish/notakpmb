import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'
import { getAllCourses } from '@/lib/courses'
import { getProgrammes } from '@/lib/subjects'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { CourseLookup } from '@/components/CourseLookup'

export const metadata: Metadata = {
  title: 'Courses - Browse all subjects & codes',
  description: 'Type a subject name and instantly see its course code. All 36 KPMB courses stored in the cloud, searchable by title or code.',
}

export default async function CoursesPage() {
  const [catalog, programmes] = await Promise.all([getAllCourses(), getProgrammes()])
  const total = catalog.length
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
    <main id="main" className="page-shell py-8 md:py-14">
      <Breadcrumbs items={[{ label: 'Index', href: '/' }, { label: 'Courses' }]} />

      <div className="mt-10 grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <section>
          <h1 className="max-w-xl text-5xl font-black leading-[0.9] tracking-[-0.06em] text-balance md:text-7xl">
            Know the code. Open the files.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-muted">
            Search {total} live courses by name or code. Pick a result to open its notes.
          </p>

          <div className="mt-8 rounded-[2rem] bg-sheet p-3 md:p-4">
            <CourseLookup autoFocus size="lg" placeholder="Try Programming Fundamentals, Database, CSC 1413, Mandarin..." />
            <p className="mt-3 px-1 text-sm text-muted">
              Results come from the cloud catalog. Press Enter on a selected result to open it.
            </p>
          </div>
        </section>

        <section className="lg:pt-2">
          {programmesWithCatalog.map((programme) => (
            <div key={programme.id} className="border-t border-line py-7 first:border-t-0 first:pt-0">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-accent">{programme.code}</p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-ink md:text-3xl">{programme.title}</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{programme.description}</p>
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
                        className="group flex items-center justify-between gap-4 py-3.5 transition-colors hover:px-4 hover:bg-soft md:py-4"
                      >
                        <span className="min-w-0">
                          <span className="block text-xs font-bold text-accent">{subject.code}</span>
                          <span className="mt-0.5 block font-semibold leading-tight text-ink">{subject.title}</span>
                        </span>
                        <ArrowRight size={18} strokeWidth={1.7} className="shrink-0 text-muted/50 transition-transform group-hover:translate-x-1 group-hover:text-ink" />
                      </Link>
                    ))}
                </div>
              )}
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
