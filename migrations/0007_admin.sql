-- Admin system: feedback statuses (new/reviewed/archived), notes, pins, history, activity, file index, sessions, programme visibility/order
-- Preserves all existing data. Run: npx wrangler d1 migrations apply notakpmb --remote

-- 1. Feedback statuses: rebuild with extended CHECK (keeps 'open' as legacy alias, maps to 'new' in code)
CREATE TABLE IF NOT EXISTS feedback_items_new (
  id TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','planned','in_progress','completed','declined','archived','open')),
  votes_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO feedback_items_new (id, body, status, votes_count, created_at, updated_at)
  SELECT id, body,
    CASE WHEN status = 'open' THEN 'new' ELSE status END,
    votes_count, created_at, updated_at
  FROM feedback_items;

DROP TABLE IF EXISTS feedback_items;
ALTER TABLE feedback_items_new RENAME TO feedback_items;

CREATE INDEX IF NOT EXISTS idx_feedback_items_popular ON feedback_items(votes_count DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_items_newest ON feedback_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_items_status ON feedback_items(status, votes_count DESC, created_at DESC);

-- 2. Admin sessions (single-owner password auth, no public accounts)
CREATE TABLE IF NOT EXISTS admin_sessions (
  token TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Activity log (private to admins)
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL DEFAULT '',
  meta TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);

-- 4. Admin notes (private, never exposed publicly)
CREATE TABLE IF NOT EXISTS admin_notes (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_admin_notes_entity ON admin_notes(entity_type, entity_id);

-- 5. Pins / featured
CREATE TABLE IF NOT EXISTS pins (
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (entity_type, entity_id)
);

-- 6. Feedback status history
CREATE TABLE IF NOT EXISTS status_history (
  id TEXT PRIMARY KEY,
  feedback_id TEXT NOT NULL REFERENCES feedback_items(id) ON DELETE CASCADE,
  old_status TEXT NOT NULL DEFAULT '',
  new_status TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_status_history_feedback ON status_history(feedback_id, created_at DESC);

-- 7. File index (joins R2 keys to subjects; R2 remains source of truth until backfilled)
CREATE TABLE IF NOT EXISTS files (
  key TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL DEFAULT '',
  size INTEGER NOT NULL DEFAULT 0,
  content_type TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_files_subject ON files(subject_id);

-- 8. Programme visibility + ordering (additive, safe on rerun via separate statements)
-- NOTE: D1/SQLite ADD COLUMN fails if column exists; migration runner applies once, so this is safe.
ALTER TABLE programmes ADD COLUMN is_hidden INTEGER NOT NULL DEFAULT 0;
ALTER TABLE programmes ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
