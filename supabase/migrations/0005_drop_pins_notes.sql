-- NotaKPMB migration 0005 — remove the pins and admin_notes features.
--
-- RATIONALE:
--   * pins was write-only: nothing ever read pin state back (no ordering,
--     no badges fed from the DB), so it provided no functionality.
--   * admin_notes (private feedback notes) was removed as a product decision.
-- Related application code (API routes, helpers, UI) is removed alongside.
--
-- NOTE: status_history was already dropped in 0003; activity_log is kept.
--
-- Dropping a table also drops its indexes and row-level-security setting.

DROP TABLE IF EXISTS pins;
DROP TABLE IF EXISTS admin_notes;
