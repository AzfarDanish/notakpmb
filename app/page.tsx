import Link from 'next/link';
import { getAllFileCounts } from '@/lib/r2';
import { semesterSubjects } from '@/lib/data';

const semesters = [
  { id: '1', title: 'Semester 1', margin: 'ml-0 md:ml-12' },
  { id: '2', title: 'Semester 2', margin: 'ml-0 md:ml-32' },
  { id: '3', title: 'Semester 3', margin: 'ml-0 md:ml-48' },
  { id: '4', title: 'Semester 4', margin: 'ml-0 md:ml-24' },
  { id: '5', title: 'Semester 5', margin: 'ml-0 md:ml-40' },
  { id: '6', title: 'Semester 6', margin: 'ml-0 md:ml-16' },
];

export default async function Home() {
  const fileCounts = await getAllFileCounts();

  return (
    <main className="max-w-7xl mx-auto px-6 py-16 md:py-32 md:px-12 flex flex-col md:flex-row gap-12 md:gap-8">
      <div className="md:w-5/12 md:sticky md:top-32 h-fit">
        <h1 className="font-serif text-6xl md:text-[10rem] font-bold tracking-tighter leading-[0.9] mb-8 md:mb-12">
          The<br />Archive.
        </h1>
        <p className="text-neutral-700 max-w-[280px] leading-relaxed text-sm">
          A meticulously curated digital repository for student notes and exercises, styled as a sophisticated academic journal. Preserving the pursuit of knowledge.
        </p>
      </div>
      
      <div className="md:w-7/12 flex flex-col gap-16 md:gap-32 mt-8 md:mt-8">
        {semesters.map((sem) => {
          const subjects = semesterSubjects[sem.id as keyof typeof semesterSubjects] || [];
          const totalFiles = subjects.reduce((acc, subject) => acc + (fileCounts[subject.id] || 0), 0);
          
          return (
            <Link key={sem.id} href={`/semester/${sem.id}`} className={`group block w-fit ${sem.margin}`}>
              <h2 className="font-serif text-4xl md:text-7xl italic mb-2 md:mb-4 group-hover:opacity-60 transition-opacity">
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
