import Link from 'next/link';
import { getAllFileCounts } from '@/lib/r2';
import { defaultProgrammeId, getProgramme } from '@/lib/data';
import { ProgrammePills } from '@/components/ProgrammePills';
import { SearchInput } from '@/components/SearchInput';

const semesterMargins = [
  'ml-0 md:ml-12',
  'ml-0 md:ml-32',
  'ml-0 md:ml-48',
  'ml-0 md:ml-24',
  'ml-0 md:ml-40',
  'ml-0 md:ml-16',
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ programme?: string }>
}) {
  const { programme } = await searchParams;
  const active = getProgramme(programme ?? '') ?? getProgramme(defaultProgrammeId);
  const fileCounts = await getAllFileCounts();
  const totalSubjects = active
    ? active.semesters.reduce((acc, sem) => acc + sem.subjects.length, 0)
    : 0;

  return (
    <main id="main" className="max-w-7xl mx-auto px-6 py-16 md:py-24 md:px-12 flex flex-col md:flex-row gap-12 md:gap-8">
      <div className="md:w-5/12 md:sticky md:top-32 h-fit">
        <h1 className="font-serif text-6xl md:text-[10rem] font-bold tracking-tighter leading-[0.9] mb-8 md:mb-10">
          The<br />Archive.
        </h1>
        <p className="text-neutral-700 max-w-[280px] leading-relaxed text-sm mb-8">
          A meticulously curated digital repository for student notes and exercises, styled as a sophisticated academic journal. Preserving the pursuit of knowledge.
        </p>

        <div className="mb-10 max-w-md">
          <SearchInput size="lg" />
        </div>

        <div className="mb-4">
          <p className="text-[10px] tracking-widest text-neutral-400 uppercase font-medium mb-3">
            Programmes
          </p>
          <ProgrammePills activeId={active?.id} />
        </div>

        {totalSubjects === 0 && (
          <p className="text-xs text-neutral-400 mt-6 max-w-[280px]">
            No subjects published for this programme yet — check back soon.
          </p>
        )}
      </div>

      <div className="md:w-7/12 flex flex-col gap-16 md:gap-24 mt-8 md:mt-4">
        {active?.semesters.map((sem, index) => {
          const totalFiles = sem.subjects.reduce(
            (acc, subject) => acc + (fileCounts[subject.id] || 0),
            0,
          );

          return (
            <Link
              key={sem.id}
              href={`/programme/${active.id}/semester/${sem.id}`}
              className={`group block w-fit ${semesterMargins[index % semesterMargins.length]}`}
            >
              <h2 className="font-serif text-4xl md:text-7xl font-bold mb-2 md:mb-4 group-hover:opacity-60 transition-opacity tracking-tight">
                {sem.title}
              </h2>
              <p className="text-[10px] tracking-widest text-neutral-400 uppercase font-medium">
                {totalFiles} FILES
              </p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
