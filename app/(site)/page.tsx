import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowRight, MessageSquarePlus, Search } from 'lucide-react';
import { getAllFileCounts } from '@/lib/r2';
import { getProgrammes } from '@/lib/subjects';
import { CourseLookup } from '@/components/CourseLookup';
import { ProgrammeListSkeleton } from '@/components/Skeleton';
import { AnnouncementSection } from '@/components/announcements/AnnouncementSection';

async function ProgrammesPanel() {
  const [programmes, fileCounts] = await Promise.all([
    getProgrammes(),
    getAllFileCounts(),
  ]);

  return (
    <section className="flex min-w-0 flex-col gap-2 xl:pt-8">
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
            className="group grid min-w-0 gap-4 rounded-[1.5rem] px-3 py-4 transition-colors hover:bg-soft sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-start sm:px-4 md:gap-5 md:rounded-[2rem] md:px-5 md:py-6 xl:grid-cols-[8rem_minmax(0,1fr)_auto] xl:items-center xl:py-7"
          >
            <p className="text-dynamic text-sm font-bold leading-tight text-accent">
              {programme.code}
            </p>
            <div className="min-w-0">
              <h2 className="text-dynamic text-xl font-black tracking-tight text-ink text-balance sm:text-2xl md:text-3xl xl:text-4xl">
                {programme.title}
              </h2>
              <p className="text-dynamic mt-2 max-w-xl text-sm leading-6 text-muted">
                {programme.description}
              </p>
            </div>
            <div className="flex min-w-0 items-center justify-between gap-4 sm:col-span-2 xl:col-span-1 xl:justify-end">
              <span className="text-dynamic text-sm font-semibold text-muted">
                {totalSubjects} subjects · {totalFiles} files
              </span>
              <ArrowRight className="shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-ink" size={20} strokeWidth={1.7} />
            </div>
          </Link>
        );
      })}
    </section>
  );
}

export default function Home() {
  return (
    <main id="main" className="page-shell">
      <div className="grid min-w-0 gap-10 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:gap-16">
        <section className="min-w-0 xl:sticky xl:top-10 xl:h-fit">
          <div className="pt-[0.02em]">
            <h1 className="text-dynamic max-w-2xl text-4xl font-black leading-[0.94] tracking-[-0.06em] text-balance xs:text-[2.8rem] sm:text-5xl md:text-6xl xl:text-7xl 2xl:text-8xl -mt-[0.09em] block">
              Find the note before class starts.
            </h1>
            <p className="text-dynamic mt-6 max-w-md text-base leading-7 text-muted">
              Search course codes, browse programmes, and open shared files from the live KPMB archive.
            </p>
          </div>

          <div className="mt-8 max-w-xl rounded-[1.75rem] bg-sheet p-3 md:mt-9 md:rounded-[2rem] md:p-4">
            <CourseLookup size="lg" placeholder="Type a subject or code" />
            <div className="mt-3 grid grid-cols-1 gap-2 px-1 sm:grid-cols-[1fr_auto] sm:gap-2">
              <Link href="/courses" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper sm:justify-start">
                <Search size={16} strokeWidth={1.7} />
                Browse courses
              </Link>
              <Link href="/feedback" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-accent sm:justify-self-end">
                <MessageSquarePlus size={16} strokeWidth={1.7} />
                Feedback
              </Link>
            </div>
          </div>
          <Suspense fallback={null}>
            <AnnouncementSection />
          </Suspense>
        </section>

        <Suspense fallback={<section className="min-w-0 xl:pt-8"><ProgrammeListSkeleton /></section>}>
          <ProgrammesPanel />
        </Suspense>
      </div>
    </main>
  );
}
