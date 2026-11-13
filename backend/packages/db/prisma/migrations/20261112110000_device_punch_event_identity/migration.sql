BEGIN;
-- userSn is the device user's UID and repeats across that user's punches.
-- Keep all historical rows and IDs (Attendance references them).
CREATE UNIQUE INDEX "device_punch_log_event_key"
  ON "device_punch_log"("school_id", "device_ip", "device_user_id", "record_time");
DROP INDEX "device_punch_log_device_ip_device_sn_key";
ALTER TABLE "device_punch_log" ALTER COLUMN "device_sn" DROP NOT NULL;
COMMIT;
