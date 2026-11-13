import { Prisma, type PrismaClient } from "@maktabi/db";
import { calculateGpa, type GpaBasis, type GpaCourse, type GpaSummary } from "./gpa-calculation.js";

export interface StudentRankingItem {
  studentId: string;
  userId: string;
  fullName: string;
  nationalCode: string;
  studentNumber: string;
  fatherName: string | null;
  birthDate: string | null;
  className: string;
  classId: string;
  fieldTitle: string;
  fieldOfStudyId: string | null;
  gradeTitle: string;
  gradeLevelId: string;
  gpa: number;
  continuousGpa: number;
  finalGpa: number;
  unitsPassed: number;
  unitsTaken: number;
  totalScoreSum: number;
  isPassedAll: boolean;
  rankInClass: number;
  rankInGradeField: number;
}

export interface StudentRankingsResult {
  academicYearId: string;
  academicYearTitle: string;
  totalStudents: number;
  highestGpa: number;
  lowestGpa: number;
  averageGpa: number;
  averageContinuousGpa: number;
  averageFinalGpa: number;
  passedStudentsCount: number;
  rankings: StudentRankingItem[];
}

export interface GetRankingsFilters {
  academicYearId: string;
  gradeLevelId?: string;
  fieldOfStudyId?: string;
  classId?: string;
}

/**
 * Retrieves and computes student rankings sorted by GPA descending and name alphabetically.
 */
export async function getStudentRankings(
  prisma: PrismaClient | Prisma.TransactionClient,
  schoolId: string,
  filters: GetRankingsFilters
): Promise<StudentRankingsResult> {
  const academicYear = await prisma.academicYear.findFirst({
    where: { id: filters.academicYearId, schoolId, deletedAt: null },
  });

  if (!academicYear) {
    throw new Error("سال تحصیلی یافت نشد");
  }

  // Base where condition for active enrollments
  const whereCondition: Prisma.EnrollmentWhereInput = {
    schoolId,
    academicYearId: filters.academicYearId,
    deletedAt: null,
    ...(filters.classId ? { classId: filters.classId } : {}),
    schoolClass: {
      deletedAt: null,
      ...(filters.gradeLevelId ? { gradeLevelId: filters.gradeLevelId } : {}),
      ...(filters.fieldOfStudyId ? { fieldOfStudyId: filters.fieldOfStudyId } : {}),
    },
  };

  const enrollments = await prisma.enrollment.findMany({
    where: whereCondition,
    include: {
      student: {
        include: {
          userSchool: {
            include: {
              user: true,
            },
          },
        },
      },
      schoolClass: {
        include: {
          gradeLevel: true,
          fieldOfStudy: true,
        },
      },
    },
  });

  // Map to intermediate objects
  const rawItems = enrollments.map((e) => {
    const user = e.student.userSchool.user;
    const gpa = e.gpa ? Number(e.gpa) : 0;
    const continuousGpa = e.continuousGpa ? Number(e.continuousGpa) : 0;
    const finalGpa = e.finalGpa ? Number(e.finalGpa) : 0;
    const unitsPassed = e.totalUnitsPassed ? Number(e.totalUnitsPassed) : 0;
    const unitsTaken = e.totalUnitsTaken ? Number(e.totalUnitsTaken) : 42;
    const totalScoreSum = e.totalScoreSum ? Number(e.totalScoreSum) : 0;

    let birthDateStr: string | null = null;
    if (user.birthDate) {
      birthDateStr = user.birthDate.toISOString().split("T")[0];
    }

    return {
      studentId: e.student.id,
      userId: user.id,
      fullName: user.fullName,
      nationalCode: user.nationalCode,
      studentNumber: e.student.studentNumber,
      fatherName: user.fatherName,
      birthDate: birthDateStr,
      className: e.schoolClass.name,
      classId: e.schoolClass.id,
      fieldTitle: e.schoolClass.fieldOfStudy?.title || "عمومی",
      fieldOfStudyId: e.schoolClass.fieldOfStudyId,
      gradeTitle: e.schoolClass.gradeLevel.title,
      gradeLevelId: e.schoolClass.gradeLevelId,
      gpa,
      continuousGpa,
      finalGpa,
      unitsPassed,
      unitsTaken,
      totalScoreSum,
      isPassedAll: unitsPassed >= unitsTaken && gpa >= 10,
    };
  });

  // Primary sort: GPA descending. Secondary sort: Full Name alphabetically.
  rawItems.sort((a, b) => {
    if (b.gpa !== a.gpa) {
      return b.gpa - a.gpa;
    }
    return a.fullName.localeCompare(b.fullName, "fa");
  });

  // Calculate ranks:
  // 1. Overall rank across this query
  // 2. Class rank
  const classCounters = new Map<string, number>();
  const rankings: StudentRankingItem[] = rawItems.map((item, index) => {
    const classCount = (classCounters.get(item.classId) || 0) + 1;
    classCounters.set(item.classId, classCount);

    return {
      ...item,
      rankInGradeField: index + 1,
      rankInClass: classCount,
    };
  });

  // Summary statistics
  const gpas = rankings.map((r) => r.gpa);
  const contGpas = rankings.map((r) => r.continuousGpa).filter((g) => g > 0);
  const finalGpas = rankings.map((r) => r.finalGpa).filter((g) => g > 0);

  const highestGpa = gpas.length > 0 ? Math.max(...gpas) : 0;
  const lowestGpa = gpas.length > 0 ? Math.min(...gpas) : 0;
  const averageGpa = gpas.length > 0 ? gpas.reduce((a, b) => a + b, 0) / gpas.length : 0;
  const averageContinuousGpa = contGpas.length > 0 ? contGpas.reduce((a, b) => a + b, 0) / contGpas.length : 0;
  const averageFinalGpa = finalGpas.length > 0 ? finalGpas.reduce((a, b) => a + b, 0) / finalGpas.length : 0;
  const passedStudentsCount = rankings.filter((r) => r.isPassedAll).length;

  return {
    academicYearId: academicYear.id,
    academicYearTitle: academicYear.title,
    totalStudents: rankings.length,
    highestGpa: Math.round(highestGpa * 100) / 100,
    lowestGpa: Math.round(lowestGpa * 100) / 100,
    averageGpa: Math.round(averageGpa * 100) / 100,
    averageContinuousGpa: Math.round(averageContinuousGpa * 100) / 100,
    averageFinalGpa: Math.round(averageFinalGpa * 100) / 100,
    passedStudentsCount,
    rankings,
  };
}

/** Read numeric calculation inputs without titles or display order. */
export async function loadGpaCourses(
  prisma: PrismaClient | Prisma.TransactionClient,
  schoolId: string,
  studentId: string,
  academicYearId: string,
): Promise<GpaCourse[]> {
  const scores = await prisma.score.findMany({
    where: {
      schoolId, studentId, deletedAt: null,
      exam: { schoolId, deletedAt: null, teachingAssignment: { schoolId, academicYearId, deletedAt: null, subject: { deletedAt: null } } },
    },
    include: { exam: { include: {
      term: { select: { termNumber: true } },
      teachingAssignment: { include: { subject: { include: { subjectModules: {
        where: { deletedAt: null }, select: { id: true, weight: true },
      } } } } },
    } } },
    orderBy: { id: "asc" },
  });
  return toGpaCourses(scores);
}

interface GpaScoreRow {
  id: string;
  score: Prisma.Decimal | number | null;
  isAbsent: boolean;
  exam: {
    examType: string;
    subjectModuleId: string | null;
    term: { termNumber: number };
    teachingAssignment: { subject: {
      id: string;
      defaultUnit: Prisma.Decimal | number;
      subjectType: string;
      subjectModules: { id: string; weight: Prisma.Decimal | number }[];
    } };
  };
}

/** Display and synchronization must use identical numeric inputs and score IDs. */
export function toGpaCourses(scores: readonly GpaScoreRow[]): GpaCourse[] {
  const courses = new Map<string, GpaCourse>();
  for (const score of scores) {
    const subject = score.exam.teachingAssignment.subject;
    if (!courses.has(subject.id)) courses.set(subject.id, {
      id: subject.id, unit: Number(subject.defaultUnit), isModular: subject.subjectType === "modular",
      modules: subject.subjectModules.map((module) => ({ id: module.id, weight: Number(module.weight) })),
      scores: [],
    });
    courses.get(subject.id)!.scores.push({
      id: score.id, type: score.exam.examType, term: score.exam.term.termNumber,
      moduleId: score.exam.subjectModuleId,
      value: score.score === null ? null : Number(score.score), isAbsent: score.isAbsent,
    });
  }
  return [...courses.values()];
}

export function enrollmentGpaSummary(enrollment: {
  gpa: unknown; continuousGpa: unknown; finalGpa: unknown;
  totalUnitsPassed: unknown; totalUnitsTaken: unknown; totalScoreSum: unknown;
}): GpaSummary {
  return {
    gpa: Number(enrollment.gpa ?? 0),
    continuousGpa: Number(enrollment.continuousGpa ?? 0),
    finalGpa: Number(enrollment.finalGpa ?? 0),
    totalUnitsPassed: Number(enrollment.totalUnitsPassed ?? 0),
    totalUnitsTaken: Number(enrollment.totalUnitsTaken ?? 0),
    totalScoreSum: Number(enrollment.totalScoreSum ?? 0),
  };
}

/** Initialize legacy records before editing their subjects, without changing grades. */
export async function captureSubjectGpaBases(
  prisma: Prisma.TransactionClient,
  schoolId: string,
  subjectId: string,
) {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      schoolId, deletedAt: null, gpaBasis: { equals: Prisma.DbNull },
      student: { scores: { some: { schoolId, deletedAt: null, exam: { teachingAssignment: { subjectId } } } } },
    },
  });
  for (const enrollment of enrollments) {
    const courses = await loadGpaCourses(prisma, schoolId, enrollment.studentId, enrollment.academicYearId);
    if (!courses.some((course) => course.id === subjectId)) continue;
    const basis: GpaBasis = { version: 1, courses, summary: enrollmentGpaSummary(enrollment) };
    await prisma.enrollment.update({
      where: { id: enrollment.id }, data: { gpaBasis: basis as unknown as Prisma.InputJsonObject },
    });
  }
}

/** Reweight the imported result, preserving its exact values for unchanged inputs. */
export async function calculateAndSyncStudentGpa(
  prisma: PrismaClient | Prisma.TransactionClient,
  schoolId: string,
  studentId: string,
  academicYearId: string,
) {
  const enrollment = await prisma.enrollment.findFirst({
    where: { schoolId, studentId, academicYearId, deletedAt: null },
  });
  if (!enrollment) throw new Error("ثبت‌نام دانش‌آموز یافت نشد");
  const courses = await loadGpaCourses(prisma, schoolId, studentId, academicYearId);
  const previous = enrollmentGpaSummary(enrollment);
  // Legacy imports did not retain the official per-course totals. Capture their
  // existing summary once; a sync must not silently replace it with an estimate.
  const basis: GpaBasis = enrollment.gpaBasis
    ? enrollment.gpaBasis as unknown as GpaBasis
    : { version: 1, courses, summary: previous };
  const summary = calculateGpa(courses, basis);
  const updated = Object.keys(summary).some((key) => summary[key as keyof GpaSummary] !== previous[key as keyof GpaSummary]);
  if (updated || !enrollment.gpaBasis) {
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        ...(updated ? summary : {}),
        ...(!enrollment.gpaBasis ? { gpaBasis: basis as unknown as Prisma.InputJsonObject } : {}),
      },
    });
  }
  return { ...summary, updated };
}
