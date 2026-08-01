import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllFileCounts } from '@/lib/r2';
import { getProgramme } from '@/lib/data';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ProgrammePills } from '@/components/ProgrammePills';

export default async function ProgrammePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const programme = getProgramme(id);

  if (!programme) {
    notFound();
  }

  const fileCounts = await getAllFileCounts();
  const totalFiles = programme.semesters.reduce(
    (acc, sem) =>
      acc + sem.subjects.reduce((a, s) => a + (fileCounts[s.id] || 0), 0),
    0,
  );
  const totalSubjects = programme.semesters.reduce(
    (acc, sem) => acc + sem.subjects.length,
    0,
  );

  return (
    <main id="main" className="max-w-7xl mx-auto px-6 py-12 md:py-16 md:px-12">
      <Breadcrumbs
        items={[
          { label: 'Index', href: '/' },
          { label: programme.title },
        ]}
      />

      <div className="mt-8 md:mt-12 mb-12 md:mb-20">
        <p className="text-[10px] tracking-widest text-accent uppercase font-bold mb-4">
          {programme.code}
        </p>
        <h1 className="font-serif text-4xl md:text-7xl font-bold tracking-tight leading-[1.05] max-w-4xl">
          {programme.title}
        </h1>
        <p className="text-neutral-600 leading-relaxed text-sm mt-6 max-w-xl">
          {programme.description}
        </p>
        <p className="text-[10px] tracking-widest text-neutral-400 uppercase font-medium mt-6">
          {totalFiles} FILES <span className="mx-2">&middot;</span>{' '}
          {totalSubjects} SUBJECTS
        </p>
      </div>

      <div className="mb-12">
        <ProgrammePills activeId={programme.id} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {programme.semesters.map((sem) => {
          const semFiles = sem.subjects.reduce(
            (acc, s) => acc + (fileCounts[s.id] || 0),
            0,
          );

          return (
            <Link
              key={sem.id}
              href={`/programme/${programme.id}/semester/${sem.id}`}
              className="group border border-neutral-200 hover:border-neutral-900 transition-colors p-6 md:p-8 flex flex-col gap-3 rounded-sm"
            >
              <h2 className="font-serif text-2xl md:text-3xl font-bold group-hover:opacity-60 transition-opacity">
                {sem.title}
              </h2>
              <p className="text-[10px] tracking-widest text-neutral-400 uppercase font-medium">
                {sem.subjects.length} SUBJECTS{' '}
                <span className="mx-1">&middot;</span> {semFiles} FILES
              </p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
