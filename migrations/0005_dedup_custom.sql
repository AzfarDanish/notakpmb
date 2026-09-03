-- Deduplicate ledger custom subjects that duplicate catalog courses
-- Keeps courses as pick-list; programme pages start empty and only show ledger.
-- This removes custom rows whose code (case-insensitive, trimmed) already exists in courses
-- for the same programme, so picker strict mode won't show duplicate code.
-- Files under the old custom subjectId prefixes in R2 will become orphaned and should be
-- re-uploaded under the catalog subject after re-adding via picker if needed.
-- If you want to preserve files, comment out the DELETE and keep ledger as-is (picker already filters).

DELETE FROM subjects
WHERE kind = 'custom'
  AND EXISTS (
    SELECT 1 FROM courses
    WHERE upper(trim(courses.code)) = upper(trim(subjects.code))
      AND courses.programme_id = subjects.programme_id
  );
