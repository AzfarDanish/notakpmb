CREATE TABLE IF NOT EXISTS feedback_items (
  id TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'planned', 'in_progress', 'completed', 'declined')),
  votes_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS feedback_votes (
  feedback_id TEXT NOT NULL REFERENCES feedback_items(id) ON DELETE CASCADE,
  voter_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (feedback_id, voter_hash)
);

CREATE TABLE IF NOT EXISTS feedback_rate_limits (
  key TEXT PRIMARY KEY,
  voter_hash TEXT NOT NULL,
  action TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_feedback_items_popular ON feedback_items(votes_count DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_items_newest ON feedback_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_items_status ON feedback_items(status, votes_count DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_votes_voter ON feedback_votes(voter_hash);
CREATE INDEX IF NOT EXISTS idx_feedback_rate_limits_voter_action ON feedback_rate_limits(voter_hash, action, window_start);
