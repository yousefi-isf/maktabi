-- DropForeignKey
ALTER TABLE "auth_session" DROP CONSTRAINT "auth_session_user_id_active_school_id_fkey";

-- AddForeignKey
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_active_school_id_fkey" FOREIGN KEY ("active_school_id") REFERENCES "school"("id") ON DELETE SET NULL ON UPDATE CASCADE;
