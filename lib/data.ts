export const semesters = {
  '1': { id: '1', title: 'Semester 1' },
  '2': { id: '2', title: 'Semester 2' },
  '3': { id: '3', title: 'Semester 3' },
  '4': { id: '4', title: 'Semester 4' },
  '5': { id: '5', title: 'Semester 5' },
  '6': { id: '6', title: 'Semester 6' },
};

export const semesterSubjects = {
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
};

export const subjectDetails = {
  'adv-typo': {
    title: 'Advanced Typography',
    code: 'DES 3010',
    semesterTitle: 'SEMESTER 5',
    semesterId: '5',
    documents: {
      notes: [],
      exercises: [],
      references: []
    }
  },
};

export function getSubjectDetails(id: string) {
  if (subjectDetails[id as keyof typeof subjectDetails]) {
    return subjectDetails[id as keyof typeof subjectDetails];
  }
  
  // Generic fallback for subjects without explicit details
  const subjectObj = Object.values(semesterSubjects).flat().find(s => s.id === id);
  const title = subjectObj?.title || 'Unknown Subject';
  const code = subjectObj?.code || 'UNKNOWN';
  const semesterId = Object.entries(semesterSubjects).find(([, subjects]) => subjects.some(s => s.id === id))?.[0] || '1';
  const semesterTitle = semesters[semesterId as keyof typeof semesters]?.title.toUpperCase() || 'UNKNOWN SEMESTER';
  
  return {
    title,
    code,
    semesterTitle,
    semesterId,
    documents: {
      notes: [],
      exercises: [],
      references: []
    }
  };
}
