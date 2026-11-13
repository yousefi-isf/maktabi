-- Retain the imported result and its inputs so syncing unchanged grades is a no-op.
ALTER TABLE "enrollment" ADD COLUMN "gpa_basis" JSONB;
