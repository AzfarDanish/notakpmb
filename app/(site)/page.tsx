import Link from 'next/link';
import { getAllFileCounts } from '@/lib/r2';
import { getProgrammes } from '@/lib/subjects';

const programmeMargins = [
  'ml-0 md:ml-12',
  'ml-0 md:ml-32',
  'ml-0 md:ml-48',
  'ml-0 md:ml-24',
  'ml-0 md:ml-40',
  'ml-0 md:ml-16',
];

export default async function Home() {
  const programmes = await getProgrammes();
  const fileCounts = await getAllFileCounts();

  return (
    <main id="main" className="max-w-7xl mx-auto px-6 py-16 md:py-24 md:px-12 flex flex-col md:flex-row gap-12 md:gap-8">
      <div className="md:w-5/12 md:sticky md:top-32 h-fit">
        <h1 className="font-serif text-6xl md:text-[10rem] font-bold tracking-tighter leading-[0.9] mb-8 md:mb-10">
          Nota<br />KPMB
        </h1>
        <p className="text-neutral-700 max-w-[280px] leading-relaxed text-sm mb-8">
          Nota KPMB (NotaKPMB): a curated digital archive of notes, exercises
          and past year questions, shared by KPMB students. Preserving the
          pursuit of knowledge. Built by students, for students. A shared
          archive only grows with your notes.
        </p>
      </div>

      <div className="md:w-7/12 flex flex-col gap-16 md:gap-24 mt-8 md:mt-4">
        {programmes.map((programme, index) => {
          const totalFiles = programme.subjects.reduce(
            (acc, subject) => acc + (fileCounts[subject.id] || 0),
            0,
          );
          const totalSubjects = programme.subjects.length;

          return (
            <Link
              key={programme.id}
              href={`/programme/${programme.id}`}
              className={`group block w-fit ${programmeMargins[index % programmeMargins.length]}`}
            >
              <h2 className="font-serif text-4xl md:text-7xl font-bold mb-2 md:mb-4 group-hover:opacity-60 transition-opacity tracking-tight">
                {programme.code}
              </h2>
              <p className="text-[10px] tracking-widest text-neutral-400 uppercase font-medium">
                {totalFiles} FILES <span className="mx-2">&middot;</span>{' '}
                {totalSubjects} SUBJECTS
              </p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
