CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT,
  code TEXT,
  programme_id TEXT,
  intake TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_subjects_kind ON subjects(kind);
CREATE INDEX IF NOT EXISTS idx_subjects_subject_id ON subjects(subject_id);
