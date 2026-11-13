ALTER TABLE "attendance"
  ADD COLUMN "daily_key" TEXT,
  ADD COLUMN "confirmed_by_id" TEXT,
  ADD COLUMN "confirmed_at" TIMESTAMPTZ,
  ADD COLUMN "manual_override" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "note" TEXT,
  ADD COLUMN "device_punch_log_id" TEXT;

CREATE UNIQUE INDEX "attendance_daily_key_key" ON "attendance"("daily_key");
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_confirmed_by_id_fkey"
  FOREIGN KEY ("confirmed_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_device_punch_log_id_fkey"
  FOREIGN KEY ("device_punch_log_id") REFERENCES "device_punch_log"("id") ON DELETE SET NULL ON UPDATE CASCADE;
