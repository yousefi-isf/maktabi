/*
  Warnings:

  - Added the required column `updated_at` to the `academic_year` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `announcement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `attendance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `audit_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `curriculum` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `enrollment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `exam` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `field_of_study` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `grade_level` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `parent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `parent_student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `permission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `role` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `role_permission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `school` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `school_class` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `score` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `subject` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `subject_module` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `teacher` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `teaching_assignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `term` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `timetable` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `user_role` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `user_school` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "academic_year" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "announcement" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "attendance" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "audit_log" ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "curriculum" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "enrollment" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "exam" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "field_of_study" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "grade_level" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "parent" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "parent_student" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "permission" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "role" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "role_permission" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "school" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "school_class" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "score" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "student" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "subject" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "subject_module" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "teacher" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "teaching_assignment" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "term" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "timetable" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "user_role" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "user_school" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;
