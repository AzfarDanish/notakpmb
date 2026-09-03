import Link from 'next/link'
import type { Metadata } from 'next'
import { getAllCourses } from '@/lib/courses'
import { getProgrammes } from '@/lib/subjects'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { CourseLookup } from '@/components/CourseLookup'

export const metadata: Metadata = {
  title: 'Courses — Browse all subjects & codes',
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
    <main id="main" className="max-w-7xl mx-auto px-6 py-12 md:py-16 md:px-12">
      <Breadcrumbs items={[{ label: 'Index', href: '/' }, { label: 'Courses' }]} />

      <div className="mt-8 md:mt-12 max-w-3xl">
        <p className="text-[10px] tracking-widest text-accent uppercase font-bold mb-4">Cloud catalog · {total} courses</p>
        <h1 className="font-serif text-5xl md:text-7xl font-bold tracking-tight leading-[0.9]">
          Courses
        </h1>
        <p className="text-neutral-600 leading-relaxed text-sm max-w-xl mt-6">
          All subjects are stored in the cloud (Cloudflare D1), not a local JSON file. Type a subject name below and the course code, programme and link appear instantly.
        </p>

        <div className="mt-8">
          <CourseLookup autoFocus size="lg" placeholder="Try Programming Fundamentals, Database, CSC 1413, Mandarin…" />
          <p className="text-xs text-neutral-500 mt-3">
            Search is live against the cloud. Press <kbd className="border border-neutral-300 rounded px-1.5 py-0.5 text-[10px]">Enter</kbd> on a result to open its notes. Also browsable below.
          </p>
        </div>
      </div>

      <div className="mt-14 md:mt-20 max-w-5xl">
        {programmesWithCatalog.map((programme) => (
          <section key={programme.id} className="mb-14 border-t border-neutral-200 pt-8">
            <div className="flex items-baseline justify-between gap-4 mb-6">
              <div>
                <p className="text-[10px] tracking-widest text-accent uppercase font-bold">{programme.code}</p>
                <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight mt-1">{programme.title}</h2>
                <p className="text-sm text-neutral-600 mt-2 max-w-xl">{programme.description}</p>
              </div>
              <span className="text-[10px] tracking-widest uppercase font-medium text-neutral-400 shrink-0">{programme.subjects.length} subjects</span>
            </div>

            {programme.subjects.length === 0 ? (
              <p className="text-sm text-neutral-500 border border-dashed border-neutral-200 rounded-sm px-4 py-6 text-center">No subjects yet.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-px bg-neutral-200 border border-neutral-200 rounded-sm overflow-hidden">
                {programme.subjects
                  .slice()
                  .sort((a, b) => a.code.localeCompare(b.code))
                  .map((subject) => (
                    <Link
                      key={subject.id}
                      href={`/subject/${subject.id}`}
                      className="group bg-white px-5 py-4 hover:bg-neutral-50 transition-colors flex items-center justify-between gap-4"
                    >
                      <span className="min-w-0">
                        <span className="block text-[10px] tracking-widest uppercase font-bold text-accent">{subject.code}</span>
                        <span className="block font-serif font-bold text-neutral-900 mt-0.5 leading-tight">{subject.title}</span>
                      </span>
                      <span className="text-neutral-300 group-hover:text-neutral-900 transition-colors text-lg leading-none">→</span>
                    </Link>
                  ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  )
}
