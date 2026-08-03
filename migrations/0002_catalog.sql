DROP TABLE IF EXISTS subjects;

CREATE TABLE programmes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE subjects (
  id TEXT PRIMARY KEY,
  programme_id TEXT NOT NULL,
  title TEXT NOT NULL,
  code TEXT NOT NULL,
  intake TEXT,
  deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE intake_exclusions (
  subject_id TEXT NOT NULL,
  intake TEXT NOT NULL,
  PRIMARY KEY (subject_id, intake)
);

INSERT INTO programmes (id, code, title, description) VALUES
  ('dcs', 'COMPUTER SCIENCE', 'Diploma in Computer Science', 'Computer science fundamentals with specialisations in artificial intelligence, cyber security, and visual business analytics.'),
  ('dbs', 'BUSINESS STUDIES', 'Diploma in Business Studies', 'Business fundamentals: management, marketing, and finance.'),
  ('dia', 'ACCOUNT · DA', 'Diploma in Accounting + Data Analytic', 'Accounting combined with data analytics skills.'),
  ('cfab', 'CERT FAB', 'Certificate in Finance, Accounting and Business', 'Foundational certificate covering finance, accounting, and business.');

INSERT INTO subjects (id, programme_id, title, code) VALUES
  ('prog-fund-1', 'dcs', 'Programming Fundamentals 1', 'CSC 1383'),
  ('uiux-design', 'dcs', 'User Interface and Experience (UIUX) Design', 'CSC 1313'),
  ('comp-arch', 'dcs', 'Computer Architecture', 'CSC 1423'),
  ('public-speaking', 'dcs', 'Public Speaking and Communication', 'MPU 2232'),
  ('pend-islam-1', 'dcs', 'Pendidikan Islam 1', 'ISL 1092'),
  ('prog-fund-2', 'dcs', 'Programming Fundamentals 2', 'CSC 1433'),
  ('db-fund', 'dcs', 'Database Fundamentals', 'CSC 1393'),
  ('sys-analysis', 'dcs', 'System Analysis and Design Fundamentals', 'CSC 1403'),
  ('pend-islam-2', 'dcs', 'Pendidikan Islam 2', 'ISL 1102'),
  ('mandarin-1', 'dcs', 'Mandarin 1', 'FLG 1202'),
  ('web-prog', 'dcs', 'Web Programming', 'CSC 1413'),
  ('algo-analysis', 'dcs', 'Algorithm Analysis and Design', 'CSC 1443'),
  ('net-datacom', 'dcs', 'Network and Data Communication', 'CSC ???'),
  ('calculus-algebra', 'dcs', 'Calculus and Algebra', 'MAT 1114'),
  ('mandarin-2', 'dcs', 'Mandarin 2', 'FLG 1212'),
  ('oop', 'dcs', 'Object Oriented Programming', 'CSC 2923'),
  ('sys-fund', 'dcs', 'Systems Fundamentals', 'CSC 2873'),
  ('os', 'dcs', 'Operating System', 'CSC ???'),
  ('discrete-math', 'dcs', 'Discrete Mathematics', 'MAT 1094'),
  ('e-entrepreneurship', 'dcs', 'e-Entrepreneurship', 'ETR 2583'),
  ('mobile-dev', 'dcs', 'Mobile Application Development', 'CSC 2813'),
  ('parallel-distributed', 'dcs', 'Parallel and Distributed Computing', 'CSC 2883'),
  ('comp-net-tech', 'dcs', 'Computer Network Technology', 'CSC ???'),
  ('business-stats', 'dcs', 'Business Statistics', 'QMT 2044'),
  ('integriti-anti-rasuah', 'dcs', 'Kursus Integriti dan Anti Rasuah', 'MPU 2412'),
  ('pengajian-malaysia-2', 'dcs', 'Pengajian Malaysia 2', 'MPU 2162'),
  ('project', 'dcs', 'Project', 'CSC 2854'),
  ('cybersec-fund', 'dcs', 'Cybersecurity Fundamentals', 'CSC 2863'),
  ('intelligent-systems', 'dcs', 'Intelligent Systems', 'CSC 2913'),
  ('ethics-computing', 'dcs', 'Ethics in Computing', 'CSC 2903'),
  ('meeting-interview', 'dcs', 'Meeting and Interview Skills', 'COM 2512');
