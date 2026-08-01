export type Subject = {
  id: string
  title: string
  code: string
}

export type Semester = {
  id: string
  title: string
  subjects: Subject[]
}

export type Programme = {
  id: string
  code: string
  title: string
  description: string
  semesters: Semester[]
}

const semesterTitles = [
  'Semester 1',
  'Semester 2',
  'Semester 3',
  'Semester 4',
  'Semester 5',
  'Semester 6',
]

function semestersOf(subjectsBySemester: Record<string, Subject[]>): Semester[] {
  return semesterTitles.map((title, index) => ({
    id: String(index + 1),
    title,
    subjects: subjectsBySemester[String(index + 1)] ?? [],
  }))
}

export const defaultProgrammeId = 'dip-cs-sas'

export const programmes: Programme[] = [
  {
    id: 'dip-cs-sas',
    code: 'DIP CS · SAS',
    title:
      'Diploma in Computer Science + SAS Certified Specialist: Visual Business Analytic',
    description:
      'Computer science fundamentals with SAS certification in visual business analytics.',
    semesters: semestersOf({
      '1': [
        { id: 'prog-fund-1', title: 'Programming Fundamentals 1', code: 'CSC 1383' },
        { id: 'uiux-design', title: 'User Interface and Experience (UIUX) Design', code: 'CSC 1313' },
        { id: 'comp-arch', title: 'Computer Architecture', code: 'CSC 1423' },
        { id: 'public-speaking', title: 'Public Speaking and Communication', code: 'MPU 2232' },
        { id: 'pend-islam-1', title: 'Pendidikan Islam 1', code: 'ISL 1092' },
      ],
      '2': [
        { id: 'prog-fund-2', title: 'Programming Fundamentals 2', code: 'CSC 1433' },
        { id: 'db-fund', title: 'Database Fundamentals', code: 'CSC 1393' },
        { id: 'sys-analysis', title: 'System Analysis and Design Fundamentals', code: 'CSC 1403' },
        { id: 'pend-islam-2', title: 'Pendidikan Islam 2', code: 'ISL 1102' },
        { id: 'mandarin-1', title: 'Mandarin 1', code: 'FLG 1202' },
      ],
      '3': [
        { id: 'web-prog', title: 'Web Programming', code: 'CSC 1413' },
        { id: 'algo-analysis', title: 'Algorithm Analysis and Design', code: 'CSC 1443' },
        { id: 'net-datacom', title: 'Network and Data Communication', code: 'CSC ???' },
        { id: 'calculus-algebra', title: 'Calculus and Algebra', code: 'MAT 1114' },
        { id: 'mandarin-2', title: 'Mandarin 2', code: 'FLG 1212' },
      ],
      '4': [
        { id: 'oop', title: 'Object Oriented Programming', code: 'CSC 2923' },
        { id: 'sys-fund', title: 'Systems Fundamentals', code: 'CSC 2873' },
        { id: 'os', title: 'Operating System', code: 'CSC ???' },
        { id: 'discrete-math', title: 'Discrete Mathematics', code: 'MAT 1094' },
        { id: 'e-entrepreneurship', title: 'e-Entrepreneurship', code: 'ETR 2583' },
      ],
      '5': [
        { id: 'mobile-dev', title: 'Mobile Application Development', code: 'CSC 2813' },
        { id: 'parallel-distributed', title: 'Parallel and Distributed Computing', code: 'CSC 2883' },
        { id: 'comp-net-tech', title: 'Computer Network Technology', code: 'CSC ???' },
        { id: 'business-stats', title: 'Business Statistics', code: 'QMT 2044' },
        { id: 'integriti-anti-rasuah', title: 'Kursus Integriti dan Anti Rasuah', code: 'MPU 2412' },
        { id: 'pengajian-malaysia-2', title: 'Pengajian Malaysia 2', code: 'MPU 2162' },
      ],
      '6': [
        { id: 'project', title: 'Project', code: 'CSC 2854' },
        { id: 'cybersec-fund', title: 'Cybersecurity Fundamentals', code: 'CSC 2863' },
        { id: 'intelligent-systems', title: 'Intelligent Systems', code: 'CSC 2913' },
        { id: 'ethics-computing', title: 'Ethics in Computing', code: 'CSC 2903' },
        { id: 'meeting-interview', title: 'Meeting and Interview Skills', code: 'COM 2512' },
      ],
    }),
  },
  {
    id: 'dip-cs-ai',
    code: 'DIP CS · AI',
    title: 'Diploma in Computer Science + Artificial Intelligence Certification',
    description:
      'Computer science with a focus on artificial intelligence and machine learning.',
    semesters: semestersOf({}),
  },
  {
    id: 'dip-cs-cyber',
    code: 'DIP CS · CYBER',
    title: 'Diploma in Computer Science + Cyber Security Certification',
    description:
      'Computer science with specialised training in cyber security.',
    semesters: semestersOf({}),
  },
  {
    id: 'dip-business',
    code: 'DIP BUSINESS',
    title: 'Diploma in Business Studies',
    description: 'Business fundamentals: management, marketing, and finance.',
    semesters: semestersOf({}),
  },
  {
    id: 'dip-acc-data',
    code: 'DIP ACC · DA',
    title: 'Diploma in Accounting + Data Analytic',
    description: 'Accounting combined with data analytics skills.',
    semesters: semestersOf({}),
  },
  {
    id: 'cert-fab',
    code: 'CERT FAB',
    title: 'Certificate in Finance, Accounting and Business',
    description: 'Foundational certificate covering finance, accounting, and business.',
    semesters: semestersOf({}),
  },
]

export function getProgrammes(): Programme[] {
  return programmes
}

export function getProgramme(id: string): Programme | undefined {
  return programmes.find((programme) => programme.id === id)
}

export function getProgrammeSemester(
  programmeId: string,
  semesterId: string,
): Semester | undefined {
  return getProgramme(programmeId)?.semesters.find(
    (semester) => semester.id === semesterId,
  )
}

export type SubjectContext = {
  subject: Subject
  programme: Programme
  semester: Semester
}

export function getSubject(id: string): SubjectContext | undefined {
  for (const programme of programmes) {
    for (const semester of programme.semesters) {
      const subject = semester.subjects.find((s) => s.id === id)
      if (subject) return { subject, programme, semester }
    }
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
    for (const semester of programme.semesters) {
      for (const subject of semester.subjects) {
        if (
          subject.title.toLowerCase().includes(q) ||
          subject.code.toLowerCase().includes(q)
        ) {
          subjects.push({ subject, programme, semester })
        }
      }
    }
  }

  return { programmes: programmeMatches, subjects }
}
