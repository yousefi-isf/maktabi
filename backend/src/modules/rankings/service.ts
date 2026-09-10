import { Prisma, type PrismaClient } from "@maktabi/db";

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

/**
 * Calculates a student's GPA and units from the raw Score table and synchronizes with Enrollment.
 */
export async function calculateAndSyncStudentGpa(
  prisma: PrismaClient | Prisma.TransactionClient,
  studentId: string,
  academicYearId: string
): Promise<{
  gpa: number;
  continuousGpa: number;
  finalGpa: number;
  unitsPassed: number;
  unitsTaken: number;
}> {
  const scores = await prisma.score.findMany({
    where: {
      studentId,
      exam: {
        teachingAssignment: { academicYearId },
      },
      deletedAt: null,
    },
    include: {
      exam: {
        include: {
          subjectModule: true,
          teachingAssignment: {
            include: { subject: true },
          },
        },
      },
    },
  });

  const subjectMap = new Map<string, { unit: number; isModular: boolean; scores: typeof scores }>();
  for (const s of scores) {
    const subj = s.exam.teachingAssignment.subject;
    if (!subjectMap.has(subj.id)) {
      subjectMap.set(subj.id, {
        unit: Number(subj.defaultUnit),
        isModular: subj.subjectType === "modular",
        scores: [],
      });
    }
    subjectMap.get(subj.id)!.scores.push(s);
  }

  let totalContinuousWeight = 0;
  let totalFinalWeight = 0;
  let totalOverallWeight = 0;

  let sumContinuousWeightedScores = 0;
  let sumFinalWeightedScores = 0;
  let sumOverallWeightedScores = 0;

  let totalUnits = 0;
  let passedUnits = 0;

  for (const [_, subj] of subjectMap) {
    totalUnits += subj.unit;

    if (!subj.isModular) {
      let c1: number | null = null;
      let f1: number | null = null;
      let c2: number | null = null;
      let f2: number | null = null;

      for (const s of subj.scores) {
        const val = s.isAbsent ? 0 : Number(s.score ?? 0);
        if (s.exam.examType === "continuous") {
          if (s.exam.title.includes("نوبت اول")) c1 = val;
          else c2 = val;
        } else if (s.exam.examType === "term_final") {
          if (s.exam.title.includes("نوبت اول")) f1 = val;
          else f2 = val;
        }
      }

      // Continuous average: if both terms exist, (c1 + c2) / 2
      let contScore = 0;
      if (c1 !== null && c2 !== null) contScore = (c1 + c2) / 2;
      else if (c2 !== null) contScore = c2;
      else if (c1 !== null) contScore = c1;

      // Final average: if both terms exist, (f1 + 2 * f2) / 3
      let finalScore = 0;
      if (f1 !== null && f2 !== null) finalScore = (f1 + 2 * f2) / 3;
      else if (f2 !== null) finalScore = f2;
      else if (f1 !== null) finalScore = f1;

      // Overall: (مستمر + ۲ * پایانی) / ۳
      const overallScore = (contScore + finalScore * 2) / 3;

      sumContinuousWeightedScores += contScore * subj.unit;
      totalContinuousWeight += subj.unit;

      sumFinalWeightedScores += finalScore * subj.unit;
      totalFinalWeight += subj.unit;

      sumOverallWeightedScores += overallScore * subj.unit;
      totalOverallWeight += subj.unit;

      // Passing check
      const annualScore = ((c1 ?? 0) + 2 * (f1 ?? 0) + (c2 ?? 0) + 4 * (f2 ?? 0)) / 8;
      const isPassed = annualScore >= 10 && (f2 ?? f1 ?? 0) >= 10;
      if (isPassed) passedUnits += subj.unit;
    } else {
      // Modular course: each module unit weight = unit / 5
      const moduleUnitWeight = subj.unit / 5;
      const modContMap = new Map<number, number>();
      const modFinalMap = new Map<number, number>();

      for (const s of subj.scores) {
        if (!s.exam.subjectModule) continue;
        const ord = s.exam.subjectModule.orderIndex;
        const val = s.isAbsent ? 0 : Number(s.score ?? 0);

        if (s.exam.examType === "modular_continuous") {
          // 1..5 scaled to 20
          modContMap.set(ord, val * 4);
        } else if (s.exam.examType === "modular_competency") {
          modFinalMap.set(ord, val);
        }
      }

      const allOrdIndices = Array.from(new Set([...modContMap.keys(), ...modFinalMap.keys()]));

      for (const ord of allOrdIndices) {
        const cVal = modContMap.get(ord);
        const fVal = modFinalMap.get(ord);

        if (cVal !== undefined) {
          sumContinuousWeightedScores += cVal * moduleUnitWeight;
          totalContinuousWeight += moduleUnitWeight;
        }

        if (fVal !== undefined) {
          sumFinalWeightedScores += fVal * moduleUnitWeight;
          totalFinalWeight += moduleUnitWeight;

          sumOverallWeightedScores += fVal * moduleUnitWeight;
          totalOverallWeight += moduleUnitWeight;
        }
      }

      const modFinalScores = Array.from(modFinalMap.values());
      const isPassed = modFinalScores.length === 5 && modFinalScores.every((score) => score >= 10);
      if (isPassed) passedUnits += subj.unit;
    }
  }

  const continuousGpa = totalContinuousWeight > 0 ? Math.round((sumContinuousWeightedScores / totalContinuousWeight) * 100) / 100 : 0;
  const finalGpa = totalFinalWeight > 0 ? Math.round((sumFinalWeightedScores / totalFinalWeight) * 100) / 100 : 0;
  const calcOverallGpa = totalOverallWeight > 0 ? Math.round((sumOverallWeightedScores / totalOverallWeight) * 100) / 100 : 0;

  // Check existing enrollment to preserve official Sida footer GPA if present
  const existingEnrollment = await prisma.enrollment.findFirst({
    where: { studentId, academicYearId, deletedAt: null },
  });

  const finalOverallGpa = existingEnrollment?.gpa && Number(existingEnrollment.gpa) > 0
    ? Number(existingEnrollment.gpa)
    : calcOverallGpa;

  const roundedSum = Math.round(sumOverallWeightedScores * 100) / 100;

  // Update Enrollment
  await prisma.enrollment.updateMany({
    where: {
      studentId,
      academicYearId,
      deletedAt: null,
    },
    data: {
      continuousGpa: new Prisma.Decimal(continuousGpa),
      finalGpa: new Prisma.Decimal(finalGpa),
      gpa: new Prisma.Decimal(finalOverallGpa),
      totalUnitsPassed: new Prisma.Decimal(passedUnits),
      totalUnitsTaken: new Prisma.Decimal(totalUnits),
      totalScoreSum: new Prisma.Decimal(roundedSum),
    },
  });

  return {
    gpa: finalOverallGpa,
    continuousGpa,
    finalGpa,
    unitsPassed: passedUnits,
    unitsTaken: totalUnits,
  };
}

