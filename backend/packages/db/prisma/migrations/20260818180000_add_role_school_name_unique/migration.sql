CREATE UNIQUE INDEX "role_school_id_name_key"
ON "role"("school_id", "name")
WHERE "deleted_at" IS NULL;
