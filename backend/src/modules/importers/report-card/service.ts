import { Prisma, type PrismaClient } from "@maktabi/db";
import type {
  ReportCardBatchDto,
  SingleReportCardDto,
  ReportCardCourseDto,
  ReportCardModuleDto,
} from "./dto.js";

export interface ImportReportCardsResult {
  schoolId: string;
  schoolName: string;
  academicYearId: string;
  academicYearTitle: string;
  classId: string;
  className: string;
  totalStudentsProcessed: number;
  studentsCreated: number;
  studentsUpdated: number;
  scoresUpserted: number;
  details: {
    nationalCode: string;
    studentName: string;
    action: "created" | "updated";
    gpa: number;
    unitsPassed: number;
  }[];
}

export interface ImportServiceContext {
  prisma: PrismaClient | Prisma.TransactionClient;
  activeSchoolId?: string | null;
}

/**
 * Service to import and upsert report cards into the database.
 * Completely idempotent: updates and replaces existing records where applicable.
 */
export async function importReportCards(
  batch: ReportCardBatchDto,
  ctx: ImportServiceContext
): Promise<ImportReportCardsResult> {
  const prisma = ctx.prisma;

  // 1. School (Find existing or create/update)
  let schoolId = ctx.activeSchoolId;
  let schoolName = batch.school.name;

  if (!schoolId) {
    let existingSchool = await prisma.school.findFirst({
      where: {
        OR: [{ name: batch.school.name }, { district: batch.school.district }],
        deletedAt: null,
      },
    });

    if (!existingSchool) {
      existingSchool = await prisma.school.create({
        data: {
          name: batch.school.name,
          district: batch.school.district,
          city: batch.school.province,
          province: batch.school.province,
          schoolType: batch.school.schoolType,
        },
      });
    } else {
      // Update school metadata if already exists
      existingSchool = await prisma.school.update({
        where: { id: existingSchool.id },
        data: {
          name: batch.school.name,
          province: batch.school.province,
          district: batch.school.district,
        },
      });
    }
    schoolId = existingSchool.id;
    schoolName = existingSchool.name;
  }

  if (!schoolId) {
    throw new Error("شناسه مدرسه معتبر یافت نشد");
  }
  const validSchoolId: string = schoolId;

  // 2. Academic Year (1404-1405) - Upsert
  const yearTitle = batch.school.academicYear;
  let academicYear = await prisma.academicYear.findFirst({
    where: { schoolId, title: yearTitle, deletedAt: null },
  });

  if (!academicYear) {
    academicYear = await prisma.academicYear.create({
      data: {
        schoolId,
        title: yearTitle,
        startDate: new Date("2025-09-23T00:00:00.000Z"),
        endDate: new Date("2026-06-21T00:00:00.000Z"),
        isActive: true,
      },
    });
  }

  // 3. Terms (Term 1 & Term 2) - Upsert
  const termsMap = new Map<number, string>();
  for (const termNo of [1, 2]) {
    let term = await prisma.term.findFirst({
      where: { academicYearId: academicYear.id, termNumber: termNo, deletedAt: null },
    });
    if (!term) {
      term = await prisma.term.create({
        data: {
          schoolId,
          academicYearId: academicYear.id,
          termNumber: termNo,
          title: termNo === 1 ? "نوبت اول" : "نوبت دوم",
          startDate: termNo === 1 ? new Date("2025-09-23T00:00:00.000Z") : new Date("2026-01-21T00:00:00.000Z"),
          endDate: termNo === 1 ? new Date("2026-01-20T00:00:00.000Z") : new Date("2026-06-21T00:00:00.000Z"),
        },
      });
    }
    termsMap.set(termNo, term.id);
  }

  // 4. GradeLevel ("دهم") & FieldOfStudy ("شبکه و نرم افزار رایانه") - Upsert
  let gradeLevel = await prisma.gradeLevel.findFirst({
    where: { schoolId, title: batch.school.gradeTitle, deletedAt: null },
  });
  if (!gradeLevel) {
    gradeLevel = await prisma.gradeLevel.create({
      data: {
        schoolId,
        title: batch.school.gradeTitle,
        orderIndex: 10,
        stage: "high_school",
      },
    });
  }

  let fieldOfStudy = await prisma.fieldOfStudy.findFirst({
    where: { schoolId, title: batch.school.fieldTitle, deletedAt: null },
  });
  if (!fieldOfStudy) {
    fieldOfStudy = await prisma.fieldOfStudy.create({
      data: {
        schoolId,
        title: batch.school.fieldTitle,
        branch: "technical",
      },
    });
  }

  // 5. SchoolClass ("کلاس دهم شبکه و نرم‌افزار") - Upsert
  const className = `کلاس ${batch.school.gradeTitle} ${batch.school.fieldTitle}`;
  let schoolClass = await prisma.schoolClass.findFirst({
    where: {
      schoolId,
      academicYearId: academicYear.id,
      gradeLevelId: gradeLevel.id,
      fieldOfStudyId: fieldOfStudy.id,
      name: className,
      deletedAt: null,
    },
  });
  if (!schoolClass) {
    schoolClass = await prisma.schoolClass.create({
      data: {
        schoolId,
        academicYearId: academicYear.id,
        gradeLevelId: gradeLevel.id,
        fieldOfStudyId: fieldOfStudy.id,
        name: className,
        capacity: 35,
      },
    });
  }

  // 6. System Teacher (for TeachingAssignments) - Upsert
  const systemTeacherNationalCode = "0000000001";
  let systemUser = await prisma.user.findUnique({
    where: { nationalCode: systemTeacherNationalCode },
  });
  if (!systemUser) {
    systemUser = await prisma.user.create({
      data: {
        fullName: "دبیر سامانه",
        nationalCode: systemTeacherNationalCode,
        email: `teacher_system_${schoolId}@maktabi.local`,
      },
    });
  }

  let teacherUserSchool = await prisma.userSchool.findUnique({
    where: { userId_schoolId: { userId: systemUser.id, schoolId } },
  });
  if (!teacherUserSchool) {
    teacherUserSchool = await prisma.userSchool.create({
      data: {
        userId: systemUser.id,
        schoolId,
        status: "active",
        joinedAt: new Date(),
      },
    });
  }

  let teacherProfile = await prisma.teacher.findUnique({
    where: { userId_schoolId: { userId: systemUser.id, schoolId } },
  });
  if (!teacherProfile) {
    teacherProfile = await prisma.teacher.create({
      data: {
        userId: systemUser.id,
        schoolId,
        employmentType: "رسمی",
      },
    });
  }

  // 7. Subjects, Modules, Curricula, TeachingAssignments & Exams - Upsert
  // Take courses from the first student as template for school subjects
  const sampleCourses = batch.students[0].courses;
  const subjectsMap = new Map<string, { id: string; isModular: boolean }>();
  const modulesMap = new Map<string, string>(); // moduleCode -> moduleId
  const assignmentsMap = new Map<string, string>(); // subjectId -> assignmentId

  for (const course of sampleCourses) {
    // Safe find-and-update for Subject (compatible with soft-delete partial indexes)
    let subject = await prisma.subject.findFirst({
      where: { schoolId, code: course.code, deletedAt: null },
    });
    if (!subject) {
      subject = await prisma.subject.create({
        data: {
          schoolId,
          code: course.code,
          name: course.title,
          defaultUnit: new Prisma.Decimal(course.unit),
          subjectType: course.isModular ? "modular" : "theoretical",
        },
      });
    } else {
      subject = await prisma.subject.update({
        where: { id: subject.id },
        data: {
          name: course.title,
          defaultUnit: new Prisma.Decimal(course.unit),
          subjectType: course.isModular ? "modular" : "theoretical",
        },
      });
    }
    subjectsMap.set(course.code, { id: subject.id, isModular: course.isModular });

    // Upsert Curriculum
    const existingCurriculum = await prisma.curriculum.findFirst({
      where: {
        academicYearId: academicYear.id,
        gradeLevelId: gradeLevel.id,
        fieldOfStudyId: fieldOfStudy.id,
        subjectId: subject.id,
        deletedAt: null,
      },
    });
    if (!existingCurriculum) {
      await prisma.curriculum.create({
        data: {
          schoolId,
          academicYearId: academicYear.id,
          gradeLevelId: gradeLevel.id,
          fieldOfStudyId: fieldOfStudy.id,
          subjectId: subject.id,
          unit: new Prisma.Decimal(course.unit),
          continuousWeight: new Prisma.Decimal(1),
          finalWeight: new Prisma.Decimal(1),
        },
      });
    } else {
      await prisma.curriculum.update({
        where: { id: existingCurriculum.id },
        data: { unit: new Prisma.Decimal(course.unit) },
      });
    }

    // Safe find-and-update for TeachingAssignment
    let assignment = await prisma.teachingAssignment.findFirst({
      where: {
        classId: schoolClass.id,
        subjectId: subject.id,
        academicYearId: academicYear.id,
        deletedAt: null,
      },
    });
    if (!assignment) {
      assignment = await prisma.teachingAssignment.create({
        data: {
          schoolId,
          classId: schoolClass.id,
          subjectId: subject.id,
          academicYearId: academicYear.id,
          teacherId: teacherProfile.id,
        },
      });
    } else {
      assignment = await prisma.teachingAssignment.update({
        where: { id: assignment.id },
        data: { teacherId: teacherProfile.id },
      });
    }
    assignmentsMap.set(subject.id, assignment.id);

    // Upsert Modules for modular subjects
    if (course.isModular && course.modules.length > 0) {
      for (const mod of course.modules) {
        let existingModule = await prisma.subjectModule.findFirst({
          where: {
            subjectId: subject.id,
            OR: [{ code: mod.code }, { orderIndex: mod.orderIndex }],
            deletedAt: null,
          },
        });

        if (!existingModule) {
          existingModule = await prisma.subjectModule.create({
            data: {
              schoolId,
              subjectId: subject.id,
              code: mod.code,
              title: mod.title,
              orderIndex: mod.orderIndex,
              weight: new Prisma.Decimal(1),
            },
          });
        } else {
          existingModule = await prisma.subjectModule.update({
            where: { id: existingModule.id },
            data: {
              code: mod.code,
              title: mod.title,
              orderIndex: mod.orderIndex,
            },
          });
        }
        modulesMap.set(mod.code, existingModule.id);
      }
    }
  }

  // 8. Pre-create/Upsert Exams
  // Map of unique exam key: `${assignmentId}_${termId}_${moduleId || 'none'}_${examType}` -> examId
  const examsMap = new Map<string, string>();
  const term1Id = termsMap.get(1)!;
  const term2Id = termsMap.get(2)!;

  for (const course of sampleCourses) {
    const subjectInfo = subjectsMap.get(course.code)!;
    const assignmentId = assignmentsMap.get(subjectInfo.id)!;

    if (!subjectInfo.isModular) {
      // General subjects have 4 exams: Term 1 (continuous, final), Term 2 (continuous, final)
      const generalExamSpecs = [
        { termId: term1Id, type: "continuous" as const, title: `مستمر نوبت اول ${course.title}` },
        { termId: term1Id, type: "term_final" as const, title: `پایانی نوبت اول ${course.title}` },
        { termId: term2Id, type: "continuous" as const, title: `مستمر نوبت دوم ${course.title}` },
        { termId: term2Id, type: "term_final" as const, title: `پایانی نوبت دوم ${course.title}` },
      ];

      for (const spec of generalExamSpecs) {
        const key = `${assignmentId}_${spec.termId}_none_${spec.type}`;
        let exam = await prisma.exam.findFirst({
          where: {
            teachingAssignmentId: assignmentId,
            termId: spec.termId,
            examType: spec.type,
            subjectModuleId: null,
            deletedAt: null,
          },
        });

        if (!exam) {
          exam = await prisma.exam.create({
            data: {
              schoolId,
              teachingAssignmentId: assignmentId,
              termId: spec.termId,
              examType: spec.type,
              title: spec.title,
              examDate: spec.termId === term1Id ? new Date("2026-01-10T00:00:00.000Z") : new Date("2026-06-10T00:00:00.000Z"),
              maxScore: new Prisma.Decimal(20),
            },
          });
        }
        examsMap.set(key, exam.id);
      }
    } else {
      // Modular subjects have 2 exams per module: continuous & competency
      for (const mod of course.modules) {
        const moduleId = modulesMap.get(mod.code)!;
        // Poodmans 1 and 2 in Term 1; 3, 4, 5 in Term 2
        const assignedTermId = mod.orderIndex <= 2 ? term1Id : term2Id;

        const modularSpecs = [
          { type: "modular_continuous" as const, title: `مستمر پودمان ${mod.orderIndex}: ${mod.title}`, max: 5 },
          { type: "modular_competency" as const, title: `شایستگی پودمان ${mod.orderIndex}: ${mod.title}`, max: 20 },
        ];

        for (const spec of modularSpecs) {
          const key = `${assignmentId}_${assignedTermId}_${moduleId}_${spec.type}`;
          let exam = await prisma.exam.findFirst({
            where: {
              teachingAssignmentId: assignmentId,
              subjectModuleId: moduleId,
              examType: spec.type,
              deletedAt: null,
            },
          });

          if (!exam) {
            exam = await prisma.exam.create({
              data: {
                schoolId,
                teachingAssignmentId: assignmentId,
                termId: assignedTermId,
                subjectModuleId: moduleId,
                examType: spec.type,
                title: spec.title,
                examDate: assignedTermId === term1Id ? new Date("2025-11-20T00:00:00.000Z") : new Date("2026-04-20T00:00:00.000Z"),
                maxScore: new Prisma.Decimal(spec.max),
              },
            });
          }
          examsMap.set(key, exam.id);
        }
      }
    }
  }

  // 9. Process Each Student (Users, Profiles, Enrollments, Scores)
  let studentsCreated = 0;
  let studentsUpdated = 0;
  let scoresUpserted = 0;
  const resultDetails: ImportReportCardsResult["details"] = [];

  for (const studentCard of batch.students) {
    const s = studentCard.student;
    const fullName = `${s.firstName} ${s.lastName}`.trim();

    // Parse BirthDate into ISO Date
    let birthDateObj: Date | null = null;
    if (s.birthDate) {
      // Convert jalali e.g. "1388/03/31" to approximate gregorian date or keep year
      // A simple standard jalali-to-gregorian mapping: 1388-03-31 ≈ 2009-06-21
      const parts = s.birthDate.split("/").map(Number);
      if (parts.length === 3 && parts[0] > 1300) {
        // Approximate conversion: jalaliYear + 621
        const gYear = parts[0] + 621;
        birthDateObj = new Date(Date.UTC(gYear, (parts[1] || 1) - 1, parts[2] || 1));
      }
    }

    // Upsert User by nationalCode
    let user = await prisma.user.findUnique({
      where: { nationalCode: s.nationalCode },
    });

    let action: "created" | "updated" = "updated";
    if (!user) {
      user = await prisma.user.create({
        data: {
          fullName,
          nationalCode: s.nationalCode,
          email: `${s.nationalCode}@maktabi.local`,
          fatherName: s.fatherName,
          birthDate: birthDateObj,
          birthPlace: s.birthPlace,
          gender: s.gender,
        },
      });
      studentsCreated++;
      action = "created";
    } else {
      // Update existing user's identity details
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          fullName,
          fatherName: s.fatherName,
          birthDate: birthDateObj ?? user.birthDate,
          birthPlace: s.birthPlace ?? user.birthPlace,
          gender: s.gender ?? user.gender,
        },
      });
      studentsUpdated++;
    }

    // Safe find-or-create UserSchool
    let userSchool = await prisma.userSchool.findFirst({
      where: { userId: user.id, schoolId, deletedAt: null },
    });
    if (!userSchool) {
      userSchool = await prisma.userSchool.create({
        data: {
          userId: user.id,
          schoolId,
          status: "active",
          joinedAt: new Date(),
        },
      });
    }

    // Safe find-and-update Student Profile
    let student = await prisma.student.findFirst({
      where: { userId: user.id, schoolId, deletedAt: null },
    });
    if (!student) {
      student = await prisma.student.create({
        data: {
          userId: user.id,
          schoolId,
          studentNumber: s.studentNumber,
        },
      });
    } else if (student.studentNumber !== s.studentNumber) {
      student = await prisma.student.update({
        where: { id: student.id },
        data: { studentNumber: s.studentNumber },
      });
    }

    // Calculate continuousGpa and finalGpa for this student card
    let cardContWeight = 0;
    let cardFinalWeight = 0;
    let cardContSum = 0;
    let cardFinalSum = 0;

    for (const c of studentCard.courses) {
      if (!c.isModular) {
        const hasT1Cont = typeof c.t1Continuous === "number";
        const hasT2Cont = typeof c.t2Continuous === "number";
        let cScore = 0;
        if (hasT1Cont && hasT2Cont) cScore = ((c.t1Continuous as number) + (c.t2Continuous as number)) / 2;
        else if (hasT2Cont) cScore = c.t2Continuous as number;
        else if (hasT1Cont) cScore = c.t1Continuous as number;

        const hasT1Final = typeof c.t1Final === "number";
        const hasT2Final = typeof c.t2Final === "number";
        let fScore = 0;
        if (hasT1Final && hasT2Final) fScore = ((c.t1Final as number) + 2 * (c.t2Final as number)) / 3;
        else if (hasT2Final) fScore = c.t2Final as number;
        else if (hasT1Final) fScore = c.t1Final as number;

        cardContSum += cScore * c.unit;
        cardContWeight += c.unit;
        cardFinalSum += fScore * c.unit;
        cardFinalWeight += c.unit;
      } else {
        const modWeight = c.unit / 5;
        for (const m of c.modules) {
          if (m.moduleContinuous !== null && m.moduleContinuous !== undefined) {
            cardContSum += (m.moduleContinuous * 4) * modWeight;
            cardContWeight += modWeight;
          }
          if (m.moduleFinalScore !== null && m.moduleFinalScore !== undefined) {
            cardFinalSum += m.moduleFinalScore * modWeight;
            cardFinalWeight += modWeight;
          }
        }
      }
    }

    const cardContinuousGpa = cardContWeight > 0 ? Math.round((cardContSum / cardContWeight) * 100) / 100 : 0;
    const cardFinalGpa = cardFinalWeight > 0 ? Math.round((cardFinalSum / cardFinalWeight) * 100) / 100 : 0;

    // Safe find-and-update Enrollment
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: student.id,
        academicYearId: academicYear.id,
        deletedAt: null,
      },
    });
    if (!existingEnrollment) {
      await prisma.enrollment.create({
        data: {
          schoolId,
          academicYearId: academicYear.id,
          studentId: student.id,
          classId: schoolClass.id,
          status: "active",
          enrolledAt: new Date("2025-09-23T00:00:00.000Z"),
          gpa: new Prisma.Decimal(studentCard.summary.gpa),
          continuousGpa: new Prisma.Decimal(cardContinuousGpa),
          finalGpa: new Prisma.Decimal(cardFinalGpa),
          totalUnitsPassed: new Prisma.Decimal(studentCard.summary.totalUnitsPassed),
          totalUnitsTaken: new Prisma.Decimal(studentCard.summary.totalUnitsTaken),
          totalScoreSum: new Prisma.Decimal(studentCard.summary.totalScoreSum),
        },
      });
    } else {
      await prisma.enrollment.update({
        where: { id: existingEnrollment.id },
        data: {
          classId: schoolClass.id,
          gpa: new Prisma.Decimal(studentCard.summary.gpa),
          continuousGpa: new Prisma.Decimal(cardContinuousGpa),
          finalGpa: new Prisma.Decimal(cardFinalGpa),
          totalUnitsPassed: new Prisma.Decimal(studentCard.summary.totalUnitsPassed),
          totalUnitsTaken: new Prisma.Decimal(studentCard.summary.totalUnitsTaken),
          totalScoreSum: new Prisma.Decimal(studentCard.summary.totalScoreSum),
        },
      });
    }

    // Helper for safe score upsert
    async function upsertScoreRecord(data: {
      examId: string;
      studentId: string;
      score: Prisma.Decimal;
      competencyLevel?: "not_achieved" | "achieved" | "beyond_expectation";
      isAbsent: boolean;
    }) {
      const existing = await prisma.score.findFirst({
        where: {
          examId: data.examId,
          studentId: data.studentId,
          deletedAt: null,
        },
      });
      if (!existing) {
        await prisma.score.create({
          data: {
            schoolId: validSchoolId,
            examId: data.examId,
            studentId: data.studentId,
            score: data.score,
            competencyLevel: data.competencyLevel,
            isAbsent: data.isAbsent,
          },
        });
      } else {
        await prisma.score.update({
          where: { id: existing.id },
          data: {
            score: data.score,
            competencyLevel: data.competencyLevel ?? existing.competencyLevel,
            isAbsent: data.isAbsent,
          },
        });
      }
      scoresUpserted++;
    }

    // Upsert Scores for all courses and modules
    for (const course of studentCard.courses) {
      const subjectInfo = subjectsMap.get(course.code);
      if (!subjectInfo) continue;
      const assignmentId = assignmentsMap.get(subjectInfo.id)!;

      if (!subjectInfo.isModular) {
        // General course grades
        const generalScores = [
          { termId: term1Id, type: "continuous", val: course.t1Continuous },
          { termId: term1Id, type: "term_final", val: course.t1Final },
          { termId: term2Id, type: "continuous", val: course.t2Continuous },
          { termId: term2Id, type: "term_final", val: course.t2Final },
        ];

        for (const gScore of generalScores) {
          if (gScore.val === null || gScore.val === undefined) continue;
          const examKey = `${assignmentId}_${gScore.termId}_none_${gScore.type}`;
          const examId = examsMap.get(examKey);
          if (!examId) continue;

          await upsertScoreRecord({
            examId,
            studentId: student.id,
            score: new Prisma.Decimal(gScore.val),
            isAbsent: false,
          });
        }
      } else {
        // Modular course poodman grades
        for (const mod of course.modules) {
          const moduleId = modulesMap.get(mod.code);
          if (!moduleId) continue;
          const assignedTermId = mod.orderIndex <= 2 ? term1Id : term2Id;

          // 1. Continuous module score (1 to 5)
          if (mod.moduleContinuous !== null && mod.moduleContinuous !== undefined) {
            const contExamKey = `${assignmentId}_${assignedTermId}_${moduleId}_modular_continuous`;
            const contExamId = examsMap.get(contExamKey);
            if (contExamId) {
              await upsertScoreRecord({
                examId: contExamId,
                studentId: student.id,
                score: new Prisma.Decimal(mod.moduleContinuous),
                isAbsent: false,
              });
            }
          }

          // 2. Competency / final module score (with competencyLevel)
          const compExamKey = `${assignmentId}_${assignedTermId}_${moduleId}_modular_competency`;
          const compExamId = examsMap.get(compExamKey);
          if (compExamId) {
            await upsertScoreRecord({
              examId: compExamId,
              studentId: student.id,
              score: new Prisma.Decimal(mod.moduleFinalScore),
              competencyLevel: mod.competencyLevel ?? "achieved",
              isAbsent: false,
            });
          }
        }
      }
    }

    resultDetails.push({
      nationalCode: s.nationalCode,
      studentName: fullName,
      action,
      gpa: studentCard.summary.gpa,
      unitsPassed: studentCard.summary.totalUnitsPassed,
    });
  }

  return {
    schoolId,
    schoolName,
    academicYearId: academicYear.id,
    academicYearTitle: academicYear.title,
    classId: schoolClass.id,
    className: schoolClass.name,
    totalStudentsProcessed: batch.students.length,
    studentsCreated,
    studentsUpdated,
    scoresUpserted,
    details: resultDetails,
  };
}

