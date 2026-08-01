import Link from 'next/link';
import { ContributePanel } from '@/components/ContributePanel';
import { DocumentSection } from '@/components/DocumentSection';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { getSubjectWithCustom } from '@/lib/subjects';
import { getSubjectDocuments } from '@/lib/r2';
import { notFound } from 'next/navigation';

export default async function SubjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await getSubjectWithCustom(id);
  const r2Docs = await getSubjectDocuments(id);

  if (!found) {
    notFound();
  }

  const { subject, programme, semester } = found;

  // Merge real documents with mock documents if R2 is configured
  const documents = {
    notes: [...(r2Docs?.notes || [])],
    exercises: [...(r2Docs?.exercises || [])],
    references: [...(r2Docs?.references || [])],
  };

  const totalFiles = documents.notes.length + documents.exercises.length + documents.references.length;

  const titleParts = subject.title.split(' ');
  const formattedTitle = titleParts.length > 1 
    ? <>{titleParts[0]}<br />{titleParts.slice(1).join(' ')}</>
    : subject.title;

  return (
    <main id="main" className="max-w-7xl mx-auto px-6 py-12 md:py-16 md:px-12">
      <Breadcrumbs
        items={[
          { label: 'Index', href: '/' },
          { label: programme.code, href: `/programme/${programme.id}` },
          {
            label: semester.title,
            href: `/programme/${programme.id}/semester/${semester.id}`,
          },
          { label: subject.title },
        ]}
      />

      <div className="mt-8 md:mt-12 flex flex-col md:flex-row gap-12 md:gap-32 relative">
        <div className="md:w-1/3 md:sticky md:top-32 h-fit flex flex-col md:min-h-[calc(100vh-14rem)]">
          <div>
            <Link
              href={`/programme/${programme.id}/semester/${semester.id}`}
              className="text-[10px] font-medium tracking-widest text-neutral-500 uppercase hover:text-neutral-900 transition-colors flex items-center gap-2 mb-8 md:mb-12 w-fit"
            >
              <span>&larr;</span> SEMESTER OVERVIEW
            </Link>

            <p className="text-[10px] tracking-widest text-accent uppercase font-bold mb-4">
              {subject.code}
            </p>

            <h1 className="font-serif text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
              {formattedTitle}
            </h1>

            <p className="text-[10px] tracking-widest text-neutral-400 uppercase font-medium">
              {totalFiles} FILES <span className="mx-2">&middot;</span> {semester.title.toUpperCase()}
            </p>
          </div>

          <div className="mt-8 md:mt-auto pt-8 md:pt-24 border-t border-neutral-200 md:border-none">
            <ContributePanel subjectId={id} />
          </div>
        </div>

        <div className="md:w-2/3 flex flex-col gap-16 md:gap-20 mt-8 md:mt-12">
          <DocumentSection title="NOTES" items={documents.notes} />
          <DocumentSection title="EXERCISES" items={documents.exercises} />
          <DocumentSection title="REFERENCES" items={documents.references} />
        </div>
      </div>
    </main>
  );
}
