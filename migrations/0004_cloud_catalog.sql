-- Cloud course catalog: stores canonical subjects in D1 instead of JSON
-- Keeps existing `programmes` and `subjects` (ledger) tables intact.
-- NOTE: courses = pick-list catalog (36 CS). Programme pages START EMPTY and only show
-- subjects added via UI (ledger kind='custom'). Courses are NOT auto-enrolled; they are
-- searchable via GET /api/courses?q= for the strict pick-only CoursePickerModal.
-- Run: npx wrangler d1 migrations apply notakpmb --remote (creates table if missing)

CREATE TABLE IF NOT EXISTS programmes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);

INSERT INTO programmes (id, code, title, description) VALUES
  ('dcs', 'COMPUTER SCIENCE', 'Diploma in Computer Science', 'Computer science fundamentals with specialisations in artificial intelligence, cyber security, and visual business analytics.'),
  ('dbs', 'BUSINESS STUDIES', 'Diploma in Business Studies', 'Business fundamentals: management, marketing, and finance.'),
  ('dia', 'ACCOUNT · DA', 'Diploma in Accounting + Data Analytic', 'Accounting combined with data analytics skills.'),
  ('cfab', 'CERT FAB', 'Certificate in Finance, Accounting and Business', 'Foundational certificate covering finance, accounting, and business.')
ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  programme_id TEXT NOT NULL REFERENCES programmes(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(code);
CREATE INDEX IF NOT EXISTS idx_courses_title ON courses(title);
CREATE INDEX IF NOT EXISTS idx_courses_programme ON courses(programme_id);

-- Seed 36 KPMB DCS subjects provided by user (normalized: ISL/ 1092 → ISL 1092, kept CSC3 placeholders as-is)
INSERT INTO courses (id, code, title, programme_id) VALUES
  ('prog-fund-1', 'CSC 1383', 'Programming Fundamentals 1', 'dcs'),
  ('uiux-design', 'CSC 1313', 'User Interface and Experience (UIUX) Design', 'dcs'),
  ('comp-arch', 'CSC 1423', 'Computer Architecture', 'dcs'),
  ('public-speaking', 'MPU 2232', 'Public Speaking and Communication', 'dcs'),
  ('pend-islam-1', 'ISL 1092', 'Pendidikan Islam 1', 'dcs'),
  ('soc-1072', 'SOC 1072', 'Pendidikan Moral', 'dcs'),
  ('koq-1011', 'KOQ 1011', 'Co-Curriculum 1', 'dcs'),
  ('prog-fund-2', 'CSC 1433', 'Programming Fundamentals 2', 'dcs'),
  ('db-fund', 'CSC 1393', 'Database Fundamentals', 'dcs'),
  ('sys-analysis', 'CSC 1403', 'System Analysis and Design Fundamentals', 'dcs'),
  ('pend-islam-2', 'ISL 1102', 'Pendidikan Islam 2', 'dcs'),
  ('soc-1082', 'SOC 1082', 'Pendidikan Moral 2', 'dcs'),
  ('mandarin-1', 'FLG 1202', 'Mandarin 1', 'dcs'),
  ('koq-1021', 'KOQ 1021', 'Co-Curriculum 2', 'dcs'),
  ('web-prog', 'CSC 1413', 'Web Programming', 'dcs'),
  ('algo-analysis', 'CSC 1443', 'Algorithm Analysis and Design', 'dcs'),
  ('net-datacom', 'CSC3', 'Network and Data Communication', 'dcs'),
  ('calculus-algebra', 'MAT 1113', 'Calculus and Algebra', 'dcs'),
  ('mandarin-2', 'FLG 1212', 'Mandarin 2', 'dcs'),
  ('oop', 'CSC 2923', 'Object Oriented Programming', 'dcs'),
  ('sys-fund', 'CSC 2873', 'Systems Fundamentals', 'dcs'),
  ('os', 'CSC3', 'Operating System', 'dcs'),
  ('discrete-math', 'MAT 1093', 'Discrete Mathematics', 'dcs'),
  ('e-entrepreneurship', 'ETR 2583', 'e-Entrepreneurship', 'dcs'),
  ('mobile-dev', 'CSC 2813', 'Mobile Application Development', 'dcs'),
  ('parallel-distributed', 'CSC 2883', 'Parallel and Distributed Computing', 'dcs'),
  ('comp-net-tech', 'CSC3', 'Computer Network Technology', 'dcs'),
  ('business-stats', 'QMT 2043', 'Business Statistics', 'dcs'),
  ('integriti-anti-rasuah', 'MPU 2412', 'Kursus Integriti dan Anti Rasuah', 'dcs'),
  ('pengajian-malaysia-2', 'MPU 2162', 'Pengajian Malaysia 2', 'dcs'),
  ('project', 'CSC 2854', 'Project', 'dcs'),
  ('cybersec-fund', 'CSC 2863', 'Cybersecurity Fundamentals', 'dcs'),
  ('intelligent-systems', 'CSC 2913', 'Intelligent Systems', 'dcs'),
  ('ethics-computing', 'CSC 2903', 'Ethics in Computing', 'dcs'),
  ('meeting-interview', 'COM 2512', 'Meeting and Interview Skills', 'dcs'),
  ('industrial-training', 'ITR 3616', 'Industrial Training', 'dcs')
ON CONFLICT(id) DO UPDATE SET code=excluded.code, title=excluded.title, programme_id=excluded.programme_id;
