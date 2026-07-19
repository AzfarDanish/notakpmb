import Link from 'next/link'

type Document = {
  title: string
  type: string
}

type SubjectData = {
  title: string
  documents: Document[]
}

const subjectData: Record<string, Record<string, SubjectData>> = {
  sem1: {
    programming: {
      title: 'Programming Fundamentals',
      documents: [
        { title: 'Introduction to C', type: 'Notes' },
        { title: 'Control Structures', type: 'Notes' },
        { title: 'Midterm Practice', type: 'Exercises' },
        { title: 'Final Exam 2023', type: 'Exam' },
      ],
    },
    math: {
      title: 'Discrete Mathematics',
      documents: [
        { title: 'Logic & Proofs', type: 'Notes' },
        { title: 'Set Theory', type: 'Notes' },
        { title: 'Past Year Questions', type: 'Exercises' },
      ],
    },
  },
}

export default function SubjectPage({
  params,
}: {
  params: { id: string; subject: string }
}) {
  const semester = subjectData[params.id]
  const subject = semester?.[params.subject]

  if (!subject) {
    return (
      <main className="min-h-screen px-10 md:px-20 py-16">
        <p className="text-sm text-secondary">Subject not found.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-10 md:px-20 py-16">
      {/* Top */}
      <div className="mb-16">
        <a
          href={`/semester/${params.id}`}
          className="text-xs tracking-wide text-secondary uppercase"
        >
          ← Semester
        </a>

        <h1 className="mt-6 font-serif italic text-5xl md:text-6xl tracking-tight max-w-2xl">
          {subject.title}
        </h1>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-16">
        {/* LEFT — Documents */}
        <div className="space-y-10">
  {subject.documents.map((doc, i) => {
    const slug = doc.title.toLowerCase().replace(/\s+/g, '-')

    return (
      <Link
        key={i}
        href={`/semester/${params.id}/${params.subject}/${slug}`}
        className="group"
      >
        <h2 className="font-serif text-2xl md:text-3xl tracking-tight group-hover:opacity-60 transition">
          {doc.title}
        </h2>

        <p className="mt-1 text-xs text-secondary tracking-wide uppercase">
          {doc.type}
        </p>
      </Link>
    )
  })}
</div>

        {/* RIGHT — Contribution */}
        <div className="border-l border-black/10 pl-8">
          <p className="text-xs tracking-wide text-secondary uppercase">
            Contribute
          </p>

          <h3 className="mt-4 font-serif text-2xl tracking-tight">
            Submit your work
          </h3>

          <p className="mt-4 text-sm text-secondary leading-relaxed">
            Share notes, exercises, or past exams to enrich the archive for
            future students.
          </p>

          <button className="mt-8 text-sm underline underline-offset-4">
            Upload Document
          </button>
        </div>
      </div>
    </main>
  )
}