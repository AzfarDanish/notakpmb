CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  publish_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_announcements_single_published ON announcements ((status)) WHERE status='published';

CREATE TABLE IF NOT EXISTS announcement_blocks (
  id TEXT PRIMARY KEY,
  announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('text','image','banner','download','upload_request')),
  position INTEGER NOT NULL DEFAULT 0,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_announcement_blocks_order ON announcement_blocks(announcement_id, position, id);

CREATE TABLE IF NOT EXISTS announcement_submissions (
  id TEXT PRIMARY KEY,
  announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  block_id TEXT NOT NULL REFERENCES announcement_blocks(id) ON DELETE CASCADE,
  uploader_hash TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  file_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_announcement_submissions_block ON announcement_submissions(block_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcement_submissions_announcement ON announcement_submissions(announcement_id, created_at DESC);

ALTER TABLE files ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'subject';
ALTER TABLE files ADD COLUMN IF NOT EXISTS announcement_id TEXT REFERENCES announcements(id) ON DELETE CASCADE;
ALTER TABLE files ADD COLUMN IF NOT EXISTS block_id TEXT REFERENCES announcement_blocks(id) ON DELETE CASCADE;
ALTER TABLE files ADD COLUMN IF NOT EXISTS submission_id TEXT REFERENCES announcement_submissions(id) ON DELETE CASCADE;
ALTER TABLE files ADD COLUMN IF NOT EXISTS original_name TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_files_announcement ON files(announcement_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_files_submission ON files(submission_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_files_kind ON files(kind, created_at DESC) WHERE deleted_at IS NULL;

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_submissions ENABLE ROW LEVEL SECURITY;

-- Atomic one-published swap, called only by the trusted service-role client.
CREATE OR REPLACE FUNCTION publish_announcement(target_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM announcements WHERE id = target_id) THEN
    RAISE EXCEPTION 'Announcement not found';
  END IF;
  UPDATE announcements
    SET status = 'archived', updated_at = now()
    WHERE status = 'published' AND id <> target_id;
  UPDATE announcements
    SET status = 'published', publish_at = COALESCE(publish_at, now()), updated_at = now()
    WHERE id = target_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION publish_announcement(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION publish_announcement(TEXT) TO service_role;
