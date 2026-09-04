import { z } from "zod";

/**
 * Zod schema & DTO for School / Academic Context extracted from report cards.
 */
export const reportCardSchoolDtoSchema = z.object({
  name: z.string().trim().min(1),
  code: z.string().trim().min(1),
  province: z.string().trim().min(1),
  district: z.string().trim().min(1),
  academicYear: z.string().trim().min(1), // e.g. "1404-1405"
  period: z.string().trim().default("ضمن سال"),
  gradeTitle: z.string().trim().min(1), // e.g. "دهم"
  fieldTitle: z.string().trim().min(1), // e.g. "شبکه و نرم‌افزار رایانه"
  fieldCode: z.string().trim().min(1), // e.g. "35101"
  schoolType: z.enum(["middle_school", "high_school", "technical"]).default("technical"),
});
export type ReportCardSchoolDto = z.infer<typeof reportCardSchoolDtoSchema>;

/**
 * Zod schema & DTO for Student identity details extracted from report cards.
 */
export const reportCardStudentDtoSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  fatherName: z.string().trim().nullable().optional(),
  nationalCode: z.string().trim().length(10),
  studentNumber: z.string().trim().min(1),
  gender: z.enum(["male", "female"]).default("male"),
  birthDate: z.string().trim().nullable().optional(), // e.g. "1388/03/31"
  birthPlace: z.string().trim().nullable().optional(),
});
export type ReportCardStudentDto = z.infer<typeof reportCardStudentDtoSchema>;

/**
 * Zod schema & DTO for a single Poodman (Module) in modular subjects.
 */
export const reportCardModuleDtoSchema = z.object({
  row: z.number().int().positive(),
  code: z.string().trim().min(1), // e.g. "68810511" or "885101"
  title: z.string().trim().min(1), // e.g. "معادله‌های درجه دوم"
  orderIndex: z.number().int().min(1).max(5),
  moduleContinuous: z.number().min(0).max(20).nullable(), // continuous score (1-5)
  competencyScore: z.string().trim().nullable().optional(), // e.g. "احراز شایستگی"
  competencyLevel: z.enum(["not_achieved", "achieved", "beyond_expectation"]).nullable().optional(),
  moduleFinalScore: z.number().min(0).max(20),
  result: z.string().trim().default("قبول"), // "قبول" | "مردود"
  isPassed: z.boolean().default(true),
});
export type ReportCardModuleDto = z.infer<typeof reportCardModuleDtoSchema>;

/**
 * Zod schema & DTO for a subject / course (General or Modular).
 */
export const reportCardCourseDtoSchema = z.object({
  row: z.number().int().positive(),
  code: z.string().trim().min(1), // e.g. "10011" or "45141"
  title: z.string().trim().min(1),
  unit: z.number().positive(), // e.g. 1, 2, 3, 4, 8
  isModular: z.boolean().default(false),
  // Theoretical grade columns (nullable for modular subjects)
  t1Continuous: z.number().min(0).max(20).nullable().optional(),
  t1Final: z.number().min(0).max(20).nullable().optional(),
  t2Continuous: z.number().min(0).max(20).nullable().optional(),
  t2Final: z.number().min(0).max(20).nullable().optional(),
  // Final / Annual score
  annualScore: z.number().min(0).max(20).nullable().optional(),
  finalScore: z.number().min(0).max(20),
  result: z.string().trim().default("قبول"), // "قبول" | "مردود" | "ناتمام"
  isPassed: z.boolean().default(true),
  // 5 modules for modular courses (empty for theoretical courses)
  modules: z.array(reportCardModuleDtoSchema).default([]),
});
export type ReportCardCourseDto = z.infer<typeof reportCardCourseDtoSchema>;

/**
 * Zod schema & DTO for the footer summary of the report card.
 */
export const reportCardSummaryDtoSchema = z.object({
  totalUnitsTaken: z.number().nonnegative(), // e.g. 42
  totalUnitsPassed: z.number().nonnegative(), // e.g. 42 or 40 or 34
  totalScoreSum: z.number().nonnegative(), // e.g. 662.50
  gpa: z.number().min(0).max(20), // e.g. 15.77
  printDate: z.string().trim().nullable().optional(),
});
export type ReportCardSummaryDto = z.infer<typeof reportCardSummaryDtoSchema>;

/**
 * Full report card for one student (2 pages).
 */
export const singleReportCardDtoSchema = z.object({
  student: reportCardStudentDtoSchema,
  courses: z.array(reportCardCourseDtoSchema),
  summary: reportCardSummaryDtoSchema,
});
export type SingleReportCardDto = z.infer<typeof singleReportCardDtoSchema>;

/**
 * Full batch import payload representing all students in a report card file.
 */
export const reportCardBatchDtoSchema = z.object({
  school: reportCardSchoolDtoSchema,
  students: z.array(singleReportCardDtoSchema).min(1),
});
export type ReportCardBatchDto = z.infer<typeof reportCardBatchDtoSchema>;

