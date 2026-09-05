-- NotaKPMB Supabase schema — migrated from Cloudflare D1 (migrations/0001..0007)
-- Apply in Supabase Dashboard → SQL Editor, or: supabase db push
-- R2 object keys are NOT stored as URLs here; `files.key` references Cloudflare R2 objects.
-- All access goes through the Next.js server with the service-role key.
-- RLS is enabled on every table; no anon/authenticated policies by design
-- (browsers never touch Supabase directly; the service role bypasses RLS).

-- ============ CORE CATALOG ============

CREATE TABLE IF NOT EXISTS programmes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  programme_id TEXT NOT NULL REFERENCES programmes(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(code);
CREATE INDEX IF NOT EXISTS idx_courses_title ON courses(title);
CREATE INDEX IF NOT EXISTS idx_courses_programme ON courses(programme_id);

-- Subject ledger / delta overlay (custom adds, renames, deletions, hides)
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT,
  code TEXT,
  programme_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subjects_kind ON subjects(kind);
CREATE INDEX IF NOT EXISTS idx_subjects_subject_id ON subjects(subject_id);

-- ============ FEEDBACK ============

CREATE TABLE IF NOT EXISTS feedback_items (
  id TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','reviewed','planned','in_progress','completed','declined','archived','open')),
  votes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feedback_items_popular ON feedback_items(votes_count DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_items_newest ON feedback_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_items_status ON feedback_items(status, votes_count DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS feedback_votes (
  feedback_id TEXT NOT NULL REFERENCES feedback_items(id) ON DELETE CASCADE,
  voter_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (feedback_id, voter_hash)
);
CREATE INDEX IF NOT EXISTS idx_feedback_votes_voter ON feedback_votes(voter_hash);

CREATE TABLE IF NOT EXISTS feedback_rate_limits (
  key TEXT PRIMARY KEY,
  voter_hash TEXT NOT NULL,
  action TEXT NOT NULL,
  window_start BIGINT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_feedback_rate_limits_voter_action
  ON feedback_rate_limits(voter_hash, action, window_start);

-- ============ ADMIN ============

CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL DEFAULT '',
  meta TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);

CREATE TABLE IF NOT EXISTS admin_notes (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_notes_entity ON admin_notes(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS pins (
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  position BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS status_history (
  id TEXT PRIMARY KEY,
  feedback_id TEXT NOT NULL REFERENCES feedback_items(id) ON DELETE CASCADE,
  old_status TEXT NOT NULL DEFAULT '',
  new_status TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_status_history_feedback ON status_history(feedback_id, created_at DESC);

-- File metadata index (content lives in Cloudflare R2; `key` is the R2 object key)
CREATE TABLE IF NOT EXISTS files (
  key TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL DEFAULT '',
  size BIGINT NOT NULL DEFAULT 0,
  content_type TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_files_subject ON files(subject_id);

-- NOTE: D1 `admin_sessions` is intentionally NOT migrated.
-- Sessions are now Supabase Auth JWTs (auth.users); no table needed.

-- ============ ROW LEVEL SECURITY ============
-- Access model: browsers never call Supabase directly. All reads/writes go
-- through Next.js Route Handlers / Server Components using the service-role
-- key, which bypasses RLS. RLS stays ON with zero public policies so that a
-- leaked anon key or a future Data API exposure reveals nothing.

ALTER TABLE programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
