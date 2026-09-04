import Link from 'next/link';
import { ArrowRight, BookOpen, Search } from 'lucide-react';
import { getAllFileCounts } from '@/lib/r2';
import { getProgrammes } from '@/lib/subjects';
import { getAllCourses } from '@/lib/courses';
import { CourseLookup } from '@/components/CourseLookup';

export default async function Home() {
  const [programmes, fileCounts, catalog] = await Promise.all([
    getProgrammes(),
    getAllFileCounts(),
    getAllCourses(),
  ]);
  const catalogCount = catalog.length;

  return (
    <main id="main" className="page-shell py-8 md:py-14">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <section className="lg:sticky lg:top-10 lg:h-fit">
          <Link href="/" className="inline-flex text-2xl font-black tracking-tight text-ink">
            NotaKPMB
          </Link>

          <div className="mt-10 md:mt-16">
            <h1 className="max-w-2xl text-5xl font-black leading-[0.9] tracking-[-0.07em] text-balance md:text-7xl lg:text-8xl">
              Find the note before class starts.
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-muted">
              Search course codes, browse programmes, and open shared files from the live KPMB archive.
            </p>
          </div>

          <div className="mt-9 max-w-xl rounded-[2rem] bg-sheet p-3 md:p-4">
            <CourseLookup size="lg" placeholder="Type a subject or code" />
            <div className="mt-3 flex flex-wrap gap-2 px-1">
              <Link href="/courses" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper">
                <BookOpen size={16} strokeWidth={1.7} />
                {catalogCount} courses
              </Link>
              <Link href="/search" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper">
                <Search size={16} strokeWidth={1.7} />
                Search files
              </Link>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3 lg:pt-8">
          {programmes.map((programme) => {
            const totalFiles = programme.subjects.reduce(
              (acc, subject) => acc + (fileCounts[subject.id] || 0),
              0,
            );
            const totalSubjects = programme.subjects.length;

            return (
              <Link
                key={programme.id}
                href={`/programme/${programme.id}`}
                className="group grid gap-5 rounded-[2rem] px-1 py-5 transition-colors hover:bg-soft sm:grid-cols-[8rem_1fr_auto] sm:items-center sm:px-5 md:py-7"
              >
                <p className="text-sm font-bold leading-tight text-accent">
                  {programme.code}
                </p>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-ink text-balance md:text-4xl">
                    {programme.title}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                    {programme.description}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <span className="text-sm font-semibold text-muted">
                    {totalSubjects} subjects · {totalFiles} files
                  </span>
                  <ArrowRight className="text-muted transition-transform group-hover:translate-x-1 group-hover:text-ink" size={20} strokeWidth={1.7} />
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
