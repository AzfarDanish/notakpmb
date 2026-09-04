import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { getAllFileCounts, isR2Configured } from '@/lib/r2';
import { getProgramme, getSubjectsForProgramme } from '@/lib/subjects';
import { CourseLookup } from '@/components/CourseLookup';
import { SubjectList } from '@/components/SubjectList';
import { StatsSkeleton, SubjectListSkeleton } from '@/components/Skeleton';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params;
  const programme = await getProgramme(id);

  if (!programme) return {};

  return {
    title: programme.title,
    description: `${programme.description} Browse and share notes, exercises and past year questions for ${programme.title}.`,
    alternates: { canonical: `/programme/${programme.id}` },
    openGraph: {
      title: programme.title,
      description: `${programme.description} Browse and share notes, exercises and past year questions for ${programme.title}.`,
    },
  };
}

async function ProgrammeStats({ id }: { id: string }) {
  const [fileCounts, subjects] = await Promise.all([
    getAllFileCounts(),
    getSubjectsForProgramme(id),
  ]);
  const totalFiles = subjects.reduce((acc, s) => acc + (fileCounts[s.id] || 0), 0);
  const totalSubjects = subjects.length;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <p className="text-3xl font-black tracking-tight text-ink tabular-nums sm:text-4xl">{totalSubjects}</p>
        <p className="mt-1 text-sm text-muted">Subjects</p>
      </div>
      <div>
        <p className="text-3xl font-black tracking-tight text-ink tabular-nums sm:text-4xl">{totalFiles}</p>
        <p className="mt-1 text-sm text-muted">Files</p>
      </div>
    </div>
  );
}

async function ProgrammeSubjects({ id, programmeTitle }: { id: string; programmeTitle: string }) {
  const subjects = await getSubjectsForProgramme(id);
  return (
    <SubjectList
      subjects={subjects}
      programmeId={id}
      programmeTitle={programmeTitle}
      canManage={isR2Configured()}
    />
  );
}

export default async function ProgrammePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const programme = await getProgramme(id);

  if (!programme) {
    notFound();
  }

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

      <section className="mt-8 grid min-w-0 gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:gap-14">
        <div className="min-w-0">
          <p className="text-dynamic text-sm font-bold text-accent">{programme.code}</p>
          <h1 className="text-dynamic mt-3 max-w-4xl text-4xl font-black leading-[0.94] tracking-[-0.05em] text-balance sm:text-5xl md:text-6xl xl:text-7xl">
            {programme.title}
          </h1>
          <p className="text-dynamic mt-6 max-w-xl text-base leading-7 text-muted">
            {programme.description}
          </p>
        </div>

        <div className="min-w-0 rounded-[1.75rem] bg-sheet p-4 md:rounded-[2rem] md:p-6 xl:self-end">
          <Suspense fallback={<StatsSkeleton />}>
            <ProgrammeStats id={id} />
          </Suspense>
          <div className="mt-5 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-stretch">
            <CourseLookup size="sm" placeholder="Search course name or code" />
            <Link href="/search" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-paper sm:shrink-0">
              <Search size={16} strokeWidth={1.7} />
              Search page
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-12 md:mt-16">
        <Suspense fallback={<SubjectListSkeleton />}>
          <ProgrammeSubjects id={id} programmeTitle={programme.title} />
        </Suspense>
      </section>
    </main>
  );
}
