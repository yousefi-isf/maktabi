-- AlterTable
ALTER TABLE "enrollment" ADD COLUMN     "gpa" DECIMAL(4,2),
ADD COLUMN     "total_score_sum" DECIMAL(6,2),
ADD COLUMN     "total_units_passed" DECIMAL(4,2),
ADD COLUMN     "total_units_taken" DECIMAL(4,2);
