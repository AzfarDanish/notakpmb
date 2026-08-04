import { notFound } from 'next/navigation';
import { getAllFileCounts, isR2Configured } from '@/lib/r2';
import { getProgramme, getSubjectsForProgramme } from '@/lib/subjects';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { SearchInput } from '@/components/SearchInput';
import { SubjectList } from '@/components/SubjectList';

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

  const fileCounts = await getAllFileCounts();
  const totalFiles = programme.subjects.reduce(
    (acc, s) => acc + (fileCounts[s.id] || 0),
    0,
  );
  const totalSubjects = programme.subjects.length;

  const subjects = await getSubjectsForProgramme(id);

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
        <div className="mt-6 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <p className="text-neutral-600 leading-relaxed text-sm max-w-xl">
            {programme.description}
          </p>
          <div className="md:shrink-0">
            <SearchInput size="sm" />
          </div>
        </div>
        <p className="text-[10px] tracking-widest text-neutral-400 uppercase font-medium mt-6">
          {totalFiles} FILES <span className="mx-2">&middot;</span>{' '}
          {totalSubjects} SUBJECTS
        </p>
      </div>

      <SubjectList
        subjects={subjects}
        programmeId={id}
        programmeTitle={programme.title}
        canManage={isR2Configured()}
      />
    </main>
  );
}
