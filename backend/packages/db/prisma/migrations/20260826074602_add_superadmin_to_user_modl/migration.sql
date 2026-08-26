-- DropForeignKey
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_school_id_fkey";

-- AlterTable
ALTER TABLE "audit_log" ALTER COLUMN "school_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "is_super_admin" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE SET NULL ON UPDATE CASCADE;
