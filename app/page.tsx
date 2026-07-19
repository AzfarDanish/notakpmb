import Link from 'next/link'

export default function HomePage() {
  const semesters = [
  { id: 'sem1', title: 'Semester 1', files: 42 },
  { id: 'sem2', title: 'Semester 2', files: 128 },
  { id: 'sem3', title: 'Semester 3', files: 96 },
]

  return (
    <main className="min-h-screen px-10 md:px-20 py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
        {/* Left */}
        <div className="max-w-xl">
          <h1 className="font-serif text-6xl md:text-7xl leading-tight tracking-tight">
            The
            <br />
            Archive.
          </h1>

          <p className="mt-8 text-sm text-secondary leading-relaxed max-w-sm">
            A curated academic archive.
          </p>
        </div>

        {/* Right */}
        <div className="flex flex-col gap-16">
          {semesters.map((s) => (
            <Link
              key={s.id}
              href={`/semester/${s.id}`}
              className="group"
            >
              <h2 className="font-serif italic text-4xl md:text-5xl tracking-tight group-hover:opacity-60 transition">
                {s.title}
              </h2>

              <p className="mt-2 text-xs text-secondary tracking-wide">
                {s.files} FILES
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}