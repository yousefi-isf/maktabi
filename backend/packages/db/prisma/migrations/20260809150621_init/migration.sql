-- CreateEnum
CREATE TYPE "SchoolType" AS ENUM ('middle_school', 'high_school', 'technical');

-- CreateEnum
CREATE TYPE "EducationStage" AS ENUM ('middle_school', 'high_school');

-- CreateEnum
CREATE TYPE "Branch" AS ENUM ('theoretical', 'technical', 'vocational');

-- CreateEnum
CREATE TYPE "SubjectType" AS ENUM ('theoretical', 'modular');

-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('continuous', 'term_final', 'national_final');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('active', 'transferred', 'graduated', 'dropped');

-- CreateEnum
CREATE TYPE "UserSchoolStatus" AS ENUM ('active', 'inactive', 'left');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('present', 'absent', 'late', 'excused');

-- CreateTable
CREATE TABLE "school" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "school_type" "SchoolType" NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "school_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_year" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "start_date" TIMESTAMPTZ NOT NULL,
    "end_date" TIMESTAMPTZ NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "academic_year_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "term" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "academic_year_id" TEXT NOT NULL,
    "term_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "start_date" TIMESTAMPTZ NOT NULL,
    "end_date" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "term_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_level" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "stage" "EducationStage" NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "grade_level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_of_study" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "branch" "Branch" NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "field_of_study_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" TEXT NOT NULL,
    "school_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permission" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "national_code" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_school" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "status" "UserSchoolStatus" NOT NULL DEFAULT 'active',
    "joined_at" TIMESTAMPTZ NOT NULL,
    "left_at" TIMESTAMPTZ,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "user_school_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "academic_year_id" TEXT,

    CONSTRAINT "user_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "student_number" TEXT NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "specialty" TEXT,
    "employment_type" TEXT,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "occupation" TEXT,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "parent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_student" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "relation_type" TEXT NOT NULL,

    CONSTRAINT "parent_student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_class" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "academic_year_id" TEXT NOT NULL,
    "grade_level_id" TEXT NOT NULL,
    "field_of_study_id" TEXT,
    "homeroom_teacher_id" TEXT,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "school_class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollment" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "academic_year_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'active',
    "enrolled_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "subject_type" "SubjectType" NOT NULL,
    "default_unit" DECIMAL(4,2) NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "academic_year_id" TEXT NOT NULL,
    "grade_level_id" TEXT NOT NULL,
    "field_of_study_id" TEXT,
    "subject_id" TEXT NOT NULL,
    "unit" DECIMAL(4,2) NOT NULL,
    "continuous_weight" DECIMAL(4,2) NOT NULL,
    "final_weight" DECIMAL(4,2) NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "curriculum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject_module" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "weight" DECIMAL(4,2) NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "subject_module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teaching_assignment" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "academic_year_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "teaching_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "teaching_assignment_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "period_no" INTEGER NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "timetable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "term_id" TEXT NOT NULL,
    "teaching_assignment_id" TEXT NOT NULL,
    "subject_module_id" TEXT,
    "exam_type" "ExamType" NOT NULL,
    "title" TEXT NOT NULL,
    "exam_date" TIMESTAMPTZ NOT NULL,
    "max_score" DECIMAL(4,2) NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "score" DECIMAL(4,2),
    "is_absent" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "term_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "timetable_id" TEXT,
    "att_date" TIMESTAMPTZ NOT NULL,
    "period_no" INTEGER,
    "status" "AttendanceStatus" NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "target_role_id" TEXT,
    "published_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "entity_name" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- -- CreateIndex
-- CREATE UNIQUE INDEX "academic_year_school_id_title_key" ON "academic_year"("school_id", "title");

-- -- CreateIndex
-- CREATE UNIQUE INDEX "term_academic_year_id_term_number_key" ON "term"("academic_year_id", "term_number");

-- -- CreateIndex
-- CREATE UNIQUE INDEX "grade_level_school_id_order_index_key" ON "grade_level"("school_id", "order_index");

-- -- CreateIndex
-- CREATE UNIQUE INDEX "permission_code_key" ON "permission"("code");

-- -- CreateIndex
-- CREATE UNIQUE INDEX "role_permission_role_id_permission_id_key" ON "role_permission"("role_id", "permission_id");

-- -- CreateIndex
-- CREATE UNIQUE INDEX "user_national_code_key" ON "user"("national_code");

-- -- CreateIndex
-- CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- -- CreateIndex
-- CREATE UNIQUE INDEX "user_school_user_id_school_id_key" ON "user_school"("user_id", "school_id");

-- -- CreateIndex
-- CREATE UNIQUE INDEX "user_role_user_id_school_id_role_id_academic_year_id_key" ON "user_role"("user_id", "school_id", "role_id", "academic_year_id");

-- -- CreateIndex
-- CREATE UNIQUE INDEX "student_user_id_school_id_key" ON "student"("user_id", "school_id");

-- -- CreateIndex
-- CREATE UNIQUE INDEX "student_school_id_student_number_key" ON "student"("school_id", "student_number");

-- -- CreateIndex
-- CREATE UNIQUE INDEX "teacher_user_id_school_id_key" ON "teacher"("user_id", "school_id");

-- -- CreateIndex
-- CREATE UNIQUE INDEX "parent_user_id_school_id_key" ON "parent"("user_id", "school_id");

-- -- CreateIndex
-- CREATE UNIQUE INDEX "parent_student_parent_id_student_id_key" ON "parent_student"("parent_id", "student_id");

-- -- CreateIndex
-- CREATE UNIQUE INDEX "school_class_school_id_academic_year_id_name_key" ON "school_class"("school_id", "academic_year_id", "name");

-- -- CreateIndex
-- CREATE INDEX "enrollment_school_id_idx" ON "enrollment"("school_id");

-- -- CreateIndex
-- CREATE UNIQUE INDEX "enrollment_student_id_academic_year_id_key" ON "enrollment"("student_id", "academic_year_id");

-- -- CreateIndex
-- CREATE UNIQUE INDEX "subject_school_id_code_key" ON "subject"("school_id", "code");

-- -- CreateIndex
-- CREATE UNIQUE INDEX "curriculum_academic_year_id_grade_level_id_field_of_study_i_key" ON "curriculum"("academic_year_id", "grade_level_id", "field_of_study_id", "subject_id");

-- -- CreateIndex
-- CREATE UNIQUE INDEX "teaching_assignment_class_id_subject_id_academic_year_id_key" ON "teaching_assignment"("class_id", "subject_id", "academic_year_id");

-- -- CreateIndex
-- CREATE INDEX "exam_school_id_term_id_idx" ON "exam"("school_id", "term_id");

-- -- CreateIndex
-- CREATE INDEX "score_school_id_student_id_idx" ON "score"("school_id", "student_id");

-- -- CreateIndex
-- CREATE UNIQUE INDEX "score_exam_id_student_id_key" ON "score"("exam_id", "student_id");

-- -- CreateIndex
-- CREATE INDEX "attendance_school_id_att_date_idx" ON "attendance"("school_id", "att_date");

-- -- CreateIndex
-- CREATE INDEX "audit_log_school_id_created_at_idx" ON "audit_log"("school_id", "created_at");

-- -- CreateIndex
-- CREATE INDEX "audit_log_entity_name_entity_id_idx" ON "audit_log"("entity_name", "entity_id");
-- CreateIndex
CREATE UNIQUE INDEX "academic_year_school_id_title_key" ON "academic_year"("school_id", "title") WHERE "deleted_at" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "term_academic_year_id_term_number_key" ON "term"("academic_year_id", "term_number") WHERE "deleted_at" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "grade_level_school_id_order_index_key" ON "grade_level"("school_id", "order_index") WHERE "deleted_at" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "permission_code_key" ON "permission"("code") WHERE "deleted_at" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "role_permission_role_id_permission_id_key" ON "role_permission"("role_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_national_code_key" ON "user"("national_code") WHERE "deleted_at" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email") WHERE "deleted_at" IS NULL;

-- CreateIndex
-- CREATE UNIQUE INDEX "user_school_user_id_school_id_key" ON "user_school"("user_id", "school_id") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "user_school_user_id_school_id_key" ON "user_school"("user_id", "school_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_role_user_id_school_id_role_id_academic_year_id_key" ON "user_role"("user_id", "school_id", "role_id", "academic_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_user_id_school_id_key" ON "student"("user_id", "school_id") WHERE "deleted_at" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "student_school_id_student_number_key" ON "student"("school_id", "student_number") WHERE "deleted_at" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "teacher_user_id_school_id_key" ON "teacher"("user_id", "school_id") WHERE "deleted_at" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "parent_user_id_school_id_key" ON "parent"("user_id", "school_id") WHERE "deleted_at" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "parent_student_parent_id_student_id_key" ON "parent_student"("parent_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "school_class_school_id_academic_year_id_name_key" ON "school_class"("school_id", "academic_year_id", "name") WHERE "deleted_at" IS NULL;

-- CreateIndex
CREATE INDEX "enrollment_school_id_idx" ON "enrollment"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "enrollment_student_id_academic_year_id_key" ON "enrollment"("student_id", "academic_year_id") WHERE "deleted_at" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "subject_school_id_code_key" ON "subject"("school_id", "code") WHERE "deleted_at" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_academic_year_id_grade_level_id_field_of_study_i_key" ON "curriculum"("academic_year_id", "grade_level_id", "field_of_study_id", "subject_id") WHERE "deleted_at" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "teaching_assignment_class_id_subject_id_academic_year_id_key" ON "teaching_assignment"("class_id", "subject_id", "academic_year_id") WHERE "deleted_at" IS NULL;

-- CreateIndex
CREATE INDEX "exam_school_id_term_id_idx" ON "exam"("school_id", "term_id");

-- CreateIndex
CREATE INDEX "score_school_id_student_id_idx" ON "score"("school_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "score_exam_id_student_id_key" ON "score"("exam_id", "student_id") WHERE "deleted_at" IS NULL;

-- CreateIndex
CREATE INDEX "attendance_school_id_att_date_idx" ON "attendance"("school_id", "att_date");

-- CreateIndex
CREATE INDEX "audit_log_school_id_created_at_idx" ON "audit_log"("school_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_entity_name_entity_id_idx" ON "audit_log"("entity_name", "entity_id");

-- AddForeignKey
ALTER TABLE "academic_year" ADD CONSTRAINT "academic_year_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term" ADD CONSTRAINT "term_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term" ADD CONSTRAINT "term_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_year"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_level" ADD CONSTRAINT "grade_level_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_of_study" ADD CONSTRAINT "field_of_study_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role" ADD CONSTRAINT "role_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_school" ADD CONSTRAINT "user_school_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_school" ADD CONSTRAINT "user_school_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_school_id_fkey" FOREIGN KEY ("user_id", "school_id") REFERENCES "user_school"("user_id", "school_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_year"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student" ADD CONSTRAINT "student_user_id_school_id_fkey" FOREIGN KEY ("user_id", "school_id") REFERENCES "user_school"("user_id", "school_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher" ADD CONSTRAINT "teacher_user_id_school_id_fkey" FOREIGN KEY ("user_id", "school_id") REFERENCES "user_school"("user_id", "school_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent" ADD CONSTRAINT "parent_user_id_school_id_fkey" FOREIGN KEY ("user_id", "school_id") REFERENCES "user_school"("user_id", "school_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_student" ADD CONSTRAINT "parent_student_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_student" ADD CONSTRAINT "parent_student_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_student" ADD CONSTRAINT "parent_student_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_class" ADD CONSTRAINT "school_class_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_class" ADD CONSTRAINT "school_class_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_year"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_class" ADD CONSTRAINT "school_class_grade_level_id_fkey" FOREIGN KEY ("grade_level_id") REFERENCES "grade_level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_class" ADD CONSTRAINT "school_class_field_of_study_id_fkey" FOREIGN KEY ("field_of_study_id") REFERENCES "field_of_study"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_class" ADD CONSTRAINT "school_class_homeroom_teacher_id_fkey" FOREIGN KEY ("homeroom_teacher_id") REFERENCES "teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_year"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "school_class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject" ADD CONSTRAINT "subject_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum" ADD CONSTRAINT "curriculum_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum" ADD CONSTRAINT "curriculum_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_year"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum" ADD CONSTRAINT "curriculum_grade_level_id_fkey" FOREIGN KEY ("grade_level_id") REFERENCES "grade_level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum" ADD CONSTRAINT "curriculum_field_of_study_id_fkey" FOREIGN KEY ("field_of_study_id") REFERENCES "field_of_study"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum" ADD CONSTRAINT "curriculum_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_module" ADD CONSTRAINT "subject_module_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_module" ADD CONSTRAINT "subject_module_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_assignment" ADD CONSTRAINT "teaching_assignment_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_assignment" ADD CONSTRAINT "teaching_assignment_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_year"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_assignment" ADD CONSTRAINT "teaching_assignment_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "school_class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_assignment" ADD CONSTRAINT "teaching_assignment_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_assignment" ADD CONSTRAINT "teaching_assignment_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable" ADD CONSTRAINT "timetable_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable" ADD CONSTRAINT "timetable_teaching_assignment_id_fkey" FOREIGN KEY ("teaching_assignment_id") REFERENCES "teaching_assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam" ADD CONSTRAINT "exam_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam" ADD CONSTRAINT "exam_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam" ADD CONSTRAINT "exam_teaching_assignment_id_fkey" FOREIGN KEY ("teaching_assignment_id") REFERENCES "teaching_assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam" ADD CONSTRAINT "exam_subject_module_id_fkey" FOREIGN KEY ("subject_module_id") REFERENCES "subject_module"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score" ADD CONSTRAINT "score_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score" ADD CONSTRAINT "score_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score" ADD CONSTRAINT "score_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "school_class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_timetable_id_fkey" FOREIGN KEY ("timetable_id") REFERENCES "timetable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_target_role_id_fkey" FOREIGN KEY ("target_role_id") REFERENCES "role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
