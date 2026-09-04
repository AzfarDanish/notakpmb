import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { getAllFileCounts, isR2Configured } from '@/lib/r2';
import { getProgramme, getSubjectsForProgramme } from '@/lib/subjects';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { CourseLookup } from '@/components/CourseLookup';
import { SubjectList } from '@/components/SubjectList';

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

  const [fileCounts, subjects] = await Promise.all([
    getAllFileCounts(),
    getSubjectsForProgramme(id),
  ]);
  const totalFiles = subjects.reduce((acc, s) => acc + (fileCounts[s.id] || 0), 0);
  const totalSubjects = subjects.length;

  return (
    <main id="main" className="page-shell py-8 md:py-14">
      <Breadcrumbs
        items={[
          { label: 'Index', href: '/' },
          { label: programme.title },
        ]}
      />

      <section className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <p className="text-sm font-bold text-accent">{programme.code}</p>
          <h1 className="mt-3 max-w-4xl text-5xl font-black leading-[0.92] tracking-[-0.06em] text-balance md:text-7xl">
            {programme.title}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted">
            {programme.description}
          </p>
        </div>

        <div className="rounded-[2rem] bg-sheet p-5 md:p-7 lg:self-end">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-4xl font-black tracking-tight text-ink">{totalSubjects}</p>
              <p className="mt-1 text-sm text-muted">Subjects</p>
            </div>
            <div>
              <p className="text-4xl font-black tracking-tight text-ink">{totalFiles}</p>
              <p className="mt-1 text-sm text-muted">Files</p>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <CourseLookup size="sm" placeholder="Search course name or code" />
            <Link href="/search" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-paper">
              <Search size={16} strokeWidth={1.7} />
              Search page
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-12 md:mt-16">
        <SubjectList
          subjects={subjects}
          programmeId={id}
          programmeTitle={programme.title}
          canManage={isR2Configured()}
        />
      </section>
    </main>
  );
}
