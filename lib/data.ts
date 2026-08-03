export type Subject = {
  id: string
  title: string
  code: string
}

export type Programme = {
  id: string
  code: string
  title: string
  description: string
  subjects: Subject[]
}

export const programmes: Programme[] = [
  {
    id: 'dcs',
    code: 'COMPUTER SCIENCE',
    title: 'Diploma in Computer Science',
    description:
      'Computer science fundamentals with specialisations in artificial intelligence, cyber security, and visual business analytics.',
    subjects: [],
  },
  {
    id: 'dbs',
    code: 'BUSINESS STUDIES',
    title: 'Diploma in Business Studies',
    description: 'Business fundamentals: management, marketing, and finance.',
    subjects: [],
  },
  {
    id: 'dia',
    code: 'ACCOUNT · DA',
    title: 'Diploma in Accounting + Data Analytic',
    description: 'Accounting combined with data analytics skills.',
    subjects: [],
  },
  {
    id: 'cfab',
    code: 'CERT FAB',
    title: 'Certificate in Finance, Accounting and Business',
    description: 'Foundational certificate covering finance, accounting, and business.',
    subjects: [],
  },
]

export function getProgrammes(): Programme[] {
  return programmes
}

export function getProgramme(id: string): Programme | undefined {
  return programmes.find((programme) => programme.id === id)
}

export type SubjectContext = {
  subject: Subject
  programme: Programme
}

export function getSubject(id: string): SubjectContext | undefined {
  for (const programme of programmes) {
    const subject = programme.subjects.find((s) => s.id === id)
    if (subject) return { subject, programme }
  }
  return undefined
}

export function searchArchive(query: string): {
  programmes: Programme[]
  subjects: SubjectContext[]
} {
  const q = query.trim().toLowerCase()
  if (!q) return { programmes: [], subjects: [] }

  const programmeMatches = programmes.filter(
    (programme) =>
      programme.title.toLowerCase().includes(q) ||
      programme.code.toLowerCase().includes(q),
  )

  const subjects: SubjectContext[] = []
  for (const programme of programmes) {
    for (const subject of programme.subjects) {
      if (
        subject.title.toLowerCase().includes(q) ||
        subject.code.toLowerCase().includes(q)
      ) {
        subjects.push({ subject, programme })
      }
    }
  }

  return { programmes: programmeMatches, subjects }
}
