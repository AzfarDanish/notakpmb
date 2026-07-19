import Link from 'next/link'

type Doc = {
  title: string
  type: string
  content: string
}

const data: Record<
  string,
  Record<string, Record<string, Doc>>
> = {
  sem1: {
    programming: {
      intro: {
        title: 'Introduction to C',
        type: 'Notes',
        content: `
C is a general-purpose programming language that is widely used for system programming.

It provides low-level memory access and efficient performance.

Key concepts include:
- Variables
- Control structures
- Functions
        `,
      },
      control: {
        title: 'Control Structures',
        type: 'Notes',
        content: `Control flow determines execution order...`,
      },
    },
  },
}

export default function DocumentPage({
  params,
}: {
  params: { id: string; subject: string; doc: string }
}) {
  const semester = data[params.id]
  const subject = semester?.[params.subject]
  const keys = subject ? Object.keys(subject) : []
  const index = keys.indexOf(params.doc)

  const doc = subject?.[params.doc]
  const prev = index > 0 ? keys[index - 1] : null
  const next = index < keys.length - 1 ? keys[index + 1] : null

  if (!doc) {
    return (
      <main className="min-h-screen px-10 md:px-20 py-16">
        <p className="text-sm text-secondary">Document not found.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-10 md:px-20 py-16">
      {/* Breadcrumbs */}
      <div className="text-xs text-secondary tracking-wide uppercase space-x-2">
        <Link href="/" className="hover:underline">
          Index
        </Link>
        <span>/</span>
        <Link href={`/semester/${params.id}`} className="hover:underline">
          {params.id}
        </Link>
        <span>/</span>
        <Link
          href={`/semester/${params.id}/${params.subject}`}
          className="hover:underline"
        >
          {params.subject}
        </Link>
      </div>

      {/* Title */}
      <div className="mt-8 mb-16 max-w-2xl">
        <h1 className="font-serif text-5xl md:text-6xl tracking-tight leading-tight">
          {doc.title}
        </h1>

        <p className="mt-4 text-xs text-secondary tracking-wide uppercase">
          {doc.type}
        </p>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-16">
        {/* Content */}
        <article className="prose prose-neutral max-w-none">
          {doc.content.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </article>

        {/* Sidebar */}
        <div className="border-l border-black/10 pl-8">
          <p className="text-xs tracking-wide text-secondary uppercase">
            Navigation
          </p>

          <div className="mt-6 space-y-4">
            {prev && (
              <Link
                href={`/semester/${params.id}/${params.subject}/${prev}`}
                className="block text-sm underline underline-offset-4"
              >
                ← Previous
              </Link>
            )}

            {next && (
              <Link
                href={`/semester/${params.id}/${params.subject}/${next}`}
                className="block text-sm underline underline-offset-4"
              >
                Next →
              </Link>
            )}
          </div>

          <div className="mt-12">
            <p className="text-xs tracking-wide text-secondary uppercase">
              Actions
            </p>

            <div className="mt-6 space-y-4">
              <button className="text-sm underline underline-offset-4">
                Download PDF
              </button>

              <button className="text-sm underline underline-offset-4">
                Copy Text
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}