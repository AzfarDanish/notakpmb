-- NotaKPMB migration 0003 — remove administrative workflow/moderation statuses.
--
-- SCOPE (see 0001/0002 for the original definitions):
--   1. feedback_items.status (new/reviewed/planned/in_progress/completed/declined/archived/open)
--      + status_history table + idx_feedback_items_status  → removed entirely.
--   2. announcement_submissions.status (new/reviewed/archived) → removed entirely.
--      All submission rows are preserved; only the workflow column goes away.
--   3. announcements.status CHECK narrowed from (draft/published/archived) to
--      (draft/published). Formerly 'archived' rows become 'draft' (private, not
--      public). The one-published-at-a-time rule (uq_announcements_single_published)
--      and the publish_announcement() RPC are preserved; the RPC now demotes the
--      previous published announcement to 'draft' instead of 'archived'.
--
-- PROTECTED (untouched): health checks, auth/RLS, programme is_hidden,
-- subjects.kind overrides, files.kind storage namespacing, publish_at/expires_at.

-- ============ 1. FEEDBACK WORKFLOW STATUS ============

-- Rows admins had hidden from the public board ('archived') have no
-- representation in the new model (there is no hidden state anymore) and must
-- not silently resurface publicly. Remove them; votes cascade via FK.
DELETE FROM feedback_items WHERE status = 'archived';

-- Clean up private admin data that pointed at the removed rows.
DELETE FROM pins WHERE entity_type = 'feedback' AND entity_id NOT IN (SELECT id FROM feedback_items);
DELETE FROM admin_notes WHERE entity_type = 'feedback' AND entity_id NOT IN (SELECT id FROM feedback_items);

-- Status-only index, then the column itself (dropping the column also drops
-- its CHECK constraint).
DROP INDEX IF EXISTS idx_feedback_items_status;
ALTER TABLE feedback_items DROP COLUMN IF EXISTS status;

-- Status-transition history served only the removed workflow.
DROP TABLE IF EXISTS status_history;

-- ============ 2. PUBLIC SUBMISSION WORKFLOW STATUS ============

-- All rows preserved; only the workflow column is removed.
ALTER TABLE announcement_submissions DROP COLUMN IF EXISTS status;

-- ============ 3. ANNOUNCEMENT MANUAL ARCHIVE ============

-- Formerly archived announcements stay private as drafts.
UPDATE announcements SET status = 'draft', updated_at = now() WHERE status = 'archived';

-- Replace the CHECK constraint (drop by discovery so the migration does not
-- depend on the auto-generated constraint name), then re-add the narrowed one.
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.announcements'::regclass AND contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE public.announcements DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE announcements
  ADD CONSTRAINT announcements_status_check CHECK (status IN ('draft', 'published'));

-- Same atomic one-published swap, but the displaced announcement returns to
-- 'draft' (private) instead of the removed 'archived' state.
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
    SET status = 'draft', updated_at = now()
    WHERE status = 'published' AND id <> target_id;
  UPDATE announcements
    SET status = 'published', publish_at = COALESCE(publish_at, now()), updated_at = now()
    WHERE id = target_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION publish_announcement(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION publish_announcement(TEXT) TO service_role;
