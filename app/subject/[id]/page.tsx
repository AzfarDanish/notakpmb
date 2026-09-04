import { ContributePanel } from '@/components/ContributePanel';
import { DocumentSection } from '@/components/DocumentSection';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { getSubjectWithCustom } from '@/lib/subjects';
import { getSubjectDocuments } from '@/lib/r2';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params;
  const found = await getSubjectWithCustom(id);

  if (!found) return {};

  const { subject, programme } = found;

  return {
    title: `${subject.title} (${subject.code})`,
    description: `Notes, exercises and past year questions for ${subject.title} (${subject.code}) — ${programme.title} at KPMB. Browse the files or contribute your own notes.`,
    alternates: { canonical: `/subject/${subject.id}` },
    openGraph: {
      title: `${subject.title} (${subject.code})`,
      description: `Notes, exercises and past year questions for ${subject.title} at KPMB. Browse the files or contribute your own notes.`,
    },
  };
}

export default async function SubjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await getSubjectWithCustom(id);
  const r2Docs = await getSubjectDocuments(id);

  if (!found) {
    notFound();
  }

  const { subject, programme } = found;

  const documents = r2Docs || [];

  const totalFiles = documents.length;

  return (
    <main
      id="main"
      className="page-shell py-6 md:py-12 xl:py-14"
    >
      <div>
        <Breadcrumbs
          items={[
            { label: 'Index', href: '/' },
            { label: programme.code, href: `/programme/${programme.id}` },
            { label: subject.title },
          ]}
        />
      </div>

      <div className="mt-8 grid min-w-0 gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] xl:gap-14">
        <section className="min-w-0 xl:sticky xl:top-10 xl:h-fit">
          <p className="text-dynamic text-sm font-bold text-accent">{subject.code}</p>
          <h1 className="text-dynamic mt-3 max-w-xl text-4xl font-black leading-[0.94] tracking-[-0.05em] text-balance sm:text-5xl md:text-6xl xl:text-7xl">
            {subject.title}
          </h1>
          <p className="text-dynamic mt-6 max-w-md text-base leading-7 text-muted">
            {programme.title}
          </p>
          <div className="mt-6 min-w-0 rounded-[1.75rem] bg-sheet p-4 md:rounded-[2rem] md:p-5">
            <p className="text-3xl font-black tracking-tight text-ink tabular-nums sm:text-4xl">{totalFiles}</p>
            <p className="mt-1 text-sm text-muted">Shared files</p>
            <div className="mt-5">
              <ContributePanel subjectId={id} />
            </div>
          </div>
        </section>

        <DocumentSection title="Files" items={documents} />
      </div>
    </main>
  );
}
