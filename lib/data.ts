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
    id: 'dip-cs',
    code: 'COMPUTER SCIENCE',
    title: 'Diploma in Computer Science',
    description:
      'Computer science fundamentals with specialisations in artificial intelligence, cyber security, and visual business analytics.',
    subjects: [
      { id: 'prog-fund-1', title: 'Programming Fundamentals 1', code: 'CSC 1383' },
      { id: 'uiux-design', title: 'User Interface and Experience (UIUX) Design', code: 'CSC 1313' },
      { id: 'comp-arch', title: 'Computer Architecture', code: 'CSC 1423' },
      { id: 'public-speaking', title: 'Public Speaking and Communication', code: 'MPU 2232' },
      { id: 'pend-islam-1', title: 'Pendidikan Islam 1', code: 'ISL 1092' },
      { id: 'prog-fund-2', title: 'Programming Fundamentals 2', code: 'CSC 1433' },
      { id: 'db-fund', title: 'Database Fundamentals', code: 'CSC 1393' },
      { id: 'sys-analysis', title: 'System Analysis and Design Fundamentals', code: 'CSC 1403' },
      { id: 'pend-islam-2', title: 'Pendidikan Islam 2', code: 'ISL 1102' },
      { id: 'mandarin-1', title: 'Mandarin 1', code: 'FLG 1202' },
      { id: 'web-prog', title: 'Web Programming', code: 'CSC 1413' },
      { id: 'algo-analysis', title: 'Algorithm Analysis and Design', code: 'CSC 1443' },
      { id: 'net-datacom', title: 'Network and Data Communication', code: 'CSC ???' },
      { id: 'calculus-algebra', title: 'Calculus and Algebra', code: 'MAT 1114' },
      { id: 'mandarin-2', title: 'Mandarin 2', code: 'FLG 1212' },
      { id: 'oop', title: 'Object Oriented Programming', code: 'CSC 2923' },
      { id: 'sys-fund', title: 'Systems Fundamentals', code: 'CSC 2873' },
      { id: 'os', title: 'Operating System', code: 'CSC ???' },
      { id: 'discrete-math', title: 'Discrete Mathematics', code: 'MAT 1094' },
      { id: 'e-entrepreneurship', title: 'e-Entrepreneurship', code: 'ETR 2583' },
      { id: 'mobile-dev', title: 'Mobile Application Development', code: 'CSC 2813' },
      { id: 'parallel-distributed', title: 'Parallel and Distributed Computing', code: 'CSC 2883' },
      { id: 'comp-net-tech', title: 'Computer Network Technology', code: 'CSC ???' },
      { id: 'business-stats', title: 'Business Statistics', code: 'QMT 2044' },
      { id: 'integriti-anti-rasuah', title: 'Kursus Integriti dan Anti Rasuah', code: 'MPU 2412' },
      { id: 'pengajian-malaysia-2', title: 'Pengajian Malaysia 2', code: 'MPU 2162' },
      { id: 'project', title: 'Project', code: 'CSC 2854' },
      { id: 'cybersec-fund', title: 'Cybersecurity Fundamentals', code: 'CSC 2863' },
      { id: 'intelligent-systems', title: 'Intelligent Systems', code: 'CSC 2913' },
      { id: 'ethics-computing', title: 'Ethics in Computing', code: 'CSC 2903' },
      { id: 'meeting-interview', title: 'Meeting and Interview Skills', code: 'COM 2512' },
    ],
  },
  {
    id: 'dip-business',
    code: 'BUSINESS STUDIES',
    title: 'Diploma in Business Studies',
    description: 'Business fundamentals: management, marketing, and finance.',
    subjects: [],
  },
  {
    id: 'dip-acc-data',
    code: 'ACCOUNT · DA',
    title: 'Diploma in Accounting + Data Analytic',
    description: 'Accounting combined with data analytics skills.',
    subjects: [],
  },
  {
    id: 'cert-fab',
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
