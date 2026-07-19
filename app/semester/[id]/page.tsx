import Link from 'next/link'

type Subject = {
  title: string
  meta: string
}

const semesterData: Record<string, { title: string; subjects: Subject[] }> = {
  sem1: {
    title: 'Semester 1',
    subjects: [
      { title: 'Programming Fundamentals', meta: 'Notes, Labs' },
      { title: 'Discrete Mathematics', meta: 'Exercises, Exams' },
      { title: 'Computer Systems', meta: 'Notes' },
    ],
  },
  sem2: {
    title: 'Semester 2',
    subjects: [
      { title: 'Data Structures', meta: 'Notes, Labs' },
      { title: 'Database Systems', meta: 'Projects, Exams' },
      { title: 'Web Development', meta: 'Exercises' },
    ],
  },
  sem3: {
    title: 'Semester 3',
    subjects: [
      { title: 'Operating Systems', meta: 'Notes, Exams' },
      { title: 'Computer Networks', meta: 'Labs' },
      { title: 'Software Engineering', meta: 'Projects' },
    ],
  },
}

export default function SemesterPage({
  params,
}: {
  params: { id: string }
}) {
  const semester = semesterData[params.id]

  if (!semester) {
    return (
      <main className="min-h-screen px-10 md:px-20 py-16">
        <p className="text-sm text-secondary">Semester not found.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-10 md:px-20 py-16">
      {/* Top */}
      <div className="mb-16">
        <a
          href="/"
          className="text-xs tracking-wide text-secondary uppercase"
        >
          ← Index
        </a>

        <h1 className="mt-6 font-serif italic text-6xl md:text-7xl tracking-tight">
          {semester.title}
        </h1>
      </div>

      {/* Subjects */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-y-16 gap-x-12">
  {semester.subjects.map((subject, i) => {
    const slug = subject.title.toLowerCase().replace(/\s+/g, '-')

    return (
      <Link
        key={i}
        href={`/semester/${params.id}/${slug}`}
        className="group"
      >
        <h2 className="font-serif text-2xl md:text-3xl tracking-tight group-hover:opacity-60 transition">
          {subject.title}
        </h2>

        <p className="mt-2 text-xs text-secondary tracking-wide">
          {subject.meta}
        </p>
      </Link>
    )
  })}
</div>
    </main>
  )
}