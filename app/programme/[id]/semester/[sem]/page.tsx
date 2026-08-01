import { notFound } from 'next/navigation';
import { getProgramme, getProgrammeSemester } from '@/lib/data';
import { getSubjectsForSemester } from '@/lib/subjects';
import { isR2Configured } from '@/lib/r2';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { SubjectList } from '@/components/SubjectList';

export default async function SemesterPage({
  params,
}: {
  params: Promise<{ id: string; sem: string }>
}) {
  const { id, sem } = await params;
  const programme = getProgramme(id);
  const semester = getProgrammeSemester(id, sem);

  if (!programme || !semester) {
    notFound();
  }

  const subjects = await getSubjectsForSemester(id, sem);

  return (
    <main id="main" className="max-w-7xl mx-auto px-6 py-12 md:py-16 md:px-12">
      <Breadcrumbs
        items={[
          { label: 'Index', href: '/' },
          { label: programme.code, href: `/programme/${programme.id}` },
          { label: semester.title },
        ]}
      />

      <div className="mt-8 md:mt-16 mb-12 md:mb-24">
        <h1 className="font-serif text-5xl md:text-9xl font-bold tracking-tight">
          {semester.title}
        </h1>
      </div>

      <SubjectList
        subjects={subjects}
        programmeId={id}
        semesterId={sem}
        semesterTitle={semester.title}
        canManage={isR2Configured()}
      />
    </main>
  );
}
