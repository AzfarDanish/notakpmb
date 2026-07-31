import Link from 'next/link';
import { semesters, semesterSubjects } from '@/lib/data';
import { notFound } from 'next/navigation';

export default async function SemesterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const semester = semesters[id as keyof typeof semesters];
  const subjects = semesterSubjects[id as keyof typeof semesterSubjects];

  if (!semester || !subjects) {
    notFound();
  }
  
  return (
    <main className="max-w-7xl mx-auto px-6 py-12 md:py-24 md:px-12">
      <div className="mb-16 md:mb-40">
        <Link href="/" className="text-[10px] font-medium tracking-widest text-neutral-500 uppercase hover:text-neutral-900 transition-colors flex items-center gap-2 mb-8 md:mb-12 w-fit">
          <span>&larr;</span> INDEX
        </Link>
        <h1 className="font-serif text-5xl md:text-9xl italic tracking-tight">
          {semester.title}
        </h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-12 md:gap-y-32">
        {subjects.map((subject) => (
          <Link key={subject.id} href={`/subject/${subject.id}`} className="group block">
            <p className="text-[10px] tracking-widest text-neutral-400 uppercase font-medium mb-2">
              {subject.code}
            </p>
            <h2 className="font-serif text-2xl md:text-3xl font-bold group-hover:opacity-60 transition-opacity">
              {subject.title}
            </h2>
          </Link>
        ))}
      </div>
    </main>
  );
}
