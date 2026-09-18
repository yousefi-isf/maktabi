-- CreateTable
CREATE TABLE "device_punch_log" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "student_id" TEXT,
    "device_user_id" TEXT NOT NULL,
    "record_time" TIMESTAMPTZ NOT NULL,
    "device_ip" TEXT NOT NULL,
    "device_sn" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_punch_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "device_punch_log_school_id_record_time_idx" ON "device_punch_log"("school_id", "record_time");

-- CreateIndex
CREATE INDEX "device_punch_log_student_id_record_time_idx" ON "device_punch_log"("student_id", "record_time");

-- CreateIndex
CREATE UNIQUE INDEX "device_punch_log_device_ip_device_sn_key" ON "device_punch_log"("device_ip", "device_sn");

-- AddForeignKey
ALTER TABLE "device_punch_log" ADD CONSTRAINT "device_punch_log_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_punch_log" ADD CONSTRAINT "device_punch_log_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
