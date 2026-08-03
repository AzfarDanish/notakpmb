DROP TABLE IF EXISTS intake_exclusions;

DROP TABLE IF EXISTS subjects;

CREATE TABLE subjects (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT,
  code TEXT,
  programme_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
