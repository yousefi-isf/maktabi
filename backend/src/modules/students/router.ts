import { z } from "zod";
import { Prisma } from "@maktabi/db";
import { router, tenantProcedure } from "../../trpc/trpc.js";
import { PERMISSIONS } from "../../config/permissions.js";
import { appError } from "../../trpc/app-error.js";
import { TRPCError } from "@trpc/server";
import { paginate, searchInput } from "../../lib/pagination.js";

export const studentsRouter = router({
  // ==========================================
  // 1. List
  // ==========================================
  list: tenantProcedure
    .input(searchInput)
    .query(async ({ ctx, input }) => {
      if (!ctx.permissions.includes(PERMISSIONS.IDENTITY.STUDENT_LIST)) {
        throw appError({ code: "FORBIDDEN", appCode: "MISSING_PERMISSION", params: { permission: PERMISSIONS.IDENTITY.STUDENT_LIST } });
      }

      const { q, ...pagination } = input;

      const where: Prisma.StudentWhereInput = {
        schoolId: ctx.activeSchoolId,
        deletedAt: null,
        userSchool: {
          user: {
            isSuperAdmin: false, // جلوگیری از نمایش ادمین‌های کل
            ...(q
              ? {
                OR: [
                  { fullName: { contains: q, mode: Prisma.QueryMode.insensitive } },
                  { nationalCode: { contains: q } },
                  { email: { contains: q, mode: Prisma.QueryMode.insensitive } },
                ],
              }
              : {}),
          }
        }
      };

      const result = await paginate(
        pagination,
        () => ctx.prisma.student.count({ where }),
        (skip, take) =>
          ctx.prisma.student.findMany({
            where,
            include: {
              userSchool: {
                include: { user: true },
              },
            },
            skip,
            take,
            orderBy: { createdAt: "desc" },
          })
      );

      type StudentWithRelations = Prisma.StudentGetPayload<{
        include: {
          userSchool: {
            include: { user: true };
          };
        };
      }>;

      return {
        ...result,
        data: result.data.map((s: StudentWithRelations) => ({
          id: s.id,
          userId: s.userSchool.user.id,
          fullName: s.userSchool.user.fullName,
          nationalCode: s.userSchool.user.nationalCode,
          email: s.userSchool.user.email,
          phone: s.userSchool.user.phone,
          image: s.userSchool.user.image,
          status: s.userSchool.status,
          joinedAt: s.userSchool.joinedAt,
          leftAt: s.userSchool.leftAt,
          studentNumber: s.studentNumber,
        })),
      };
    }),

  // ==========================================
  // 1.1 Get By ID
  // ==========================================
  getById: tenantProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.permissions.includes(PERMISSIONS.IDENTITY.STUDENT_LIST)) {
        throw appError({ code: "FORBIDDEN", appCode: "MISSING_PERMISSION", params: { permission: PERMISSIONS.IDENTITY.STUDENT_LIST } });
      }
      const schoolId = ctx.activeSchoolId;
      const student = await ctx.prisma.student.findFirst({
        where: { id: input.id, schoolId, deletedAt: null },
        include: {
          userSchool: {
            include: { user: true },
          },
        },
      });

      if (!student) {
        throw new TRPCError({ code: "NOT_FOUND", message: "دانش‌آموز یافت نشد." });
      }

      return {
        id: student.id,
        userId: student.userSchool.user.id,
        fullName: student.userSchool.user.fullName,
        nationalCode: student.userSchool.user.nationalCode,
        email: student.userSchool.user.email,
        phone: student.userSchool.user.phone,
        image: student.userSchool.user.image,
        status: student.userSchool.status,
        joinedAt: student.userSchool.joinedAt,
        leftAt: student.userSchool.leftAt,
        studentNumber: student.studentNumber,
      };
    }),

  // ==========================================
  // 2. Create
  // ==========================================
  create: tenantProcedure
    .input(
      z.object({
        fullName: z.string().min(3),
        nationalCode: z.string().length(10),
        email: z.string().email(),
        phone: z.string().optional(),
        studentNumber: z.string().min(1),
        status: z.enum(["active", "inactive", "left"]).optional().default("active"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.permissions.includes(PERMISSIONS.IDENTITY.STUDENT_CREATE)) {
        throw appError({ code: "FORBIDDEN", appCode: "MISSING_PERMISSION", params: { permission: PERMISSIONS.IDENTITY.STUDENT_CREATE } });
      }
      const schoolId = ctx.activeSchoolId;

      return await ctx.prisma.$transaction(async (tx) => {
        let user = await tx.user.findUnique({
          where: { nationalCode: input.nationalCode }
        });

        if (!user) {
          user = await tx.user.create({
            data: {
              fullName: input.fullName,
              nationalCode: input.nationalCode,
              email: input.email,
              phone: input.phone || null,
            }
          });
        } else {
          user = await tx.user.update({
            where: { id: user.id },
            data: {
              fullName: input.fullName,
              email: input.email,
              phone: input.phone || null,
            }
          });
        }

        const existingStudent = await tx.student.findUnique({
          where: { userId_schoolId: { userId: user.id, schoolId } }
        });

        if (existingStudent && !existingStudent.deletedAt) {
          throw new TRPCError({ code: "CONFLICT", message: "این دانش‌آموز قبلاً در این مدرسه ثبت شده است." });
        }

        let userSchool = await tx.userSchool.findUnique({
          where: { userId_schoolId: { userId: user.id, schoolId } }
        });

        if (userSchool) {
          userSchool = await tx.userSchool.update({
            where: { id: userSchool.id },
            data: { status: input.status, leftAt: input.status === "left" ? new Date() : null, deletedAt: null }
          });
        } else {
          userSchool = await tx.userSchool.create({
            data: { userId: user.id, schoolId, joinedAt: new Date(), status: input.status, leftAt: input.status === "left" ? new Date() : null }
          });
        }

        // بررسی یکتا بودن شماره دانش‌آموزی در این مدرسه
        const duplicateStudentNumber = await tx.student.findFirst({
          where: {
            schoolId,
            studentNumber: input.studentNumber,
            userId: { not: user.id } // برای کاربری غیر از کاربر فعلی نباشد
          }
        });

        if (duplicateStudentNumber) {
          throw new TRPCError({ code: "CONFLICT", message: "این شماره دانش‌آموزی قبلاً برای شخص دیگری ثبت شده است." });
        }

        let student;
        if (existingStudent) {
          student = await tx.student.update({
            where: { id: existingStudent.id },
            data: { studentNumber: input.studentNumber, deletedAt: null }
          });
        } else {
          student = await tx.student.create({
            data: { userId: user.id, schoolId, studentNumber: input.studentNumber }
          });
        }

        return { success: true, studentId: student.id };
      });
    }),

  // ==========================================
  // 3. Update
  // ==========================================
  update: tenantProcedure
    .input(
      z.object({
        studentId: z.string(),
        fullName: z.string().min(3),
        nationalCode: z.string().length(10),
        email: z.email(),
        phone: z.string().optional(),
        studentNumber: z.string().min(1),
        status: z.enum(["active", "inactive", "left"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.permissions.includes(PERMISSIONS.IDENTITY.STUDENT_UPDATE)) {
        throw appError({ code: "FORBIDDEN", appCode: "MISSING_PERMISSION", params: { permission: PERMISSIONS.IDENTITY.STUDENT_UPDATE } });
      }
      const schoolId = ctx.activeSchoolId;
      const student = await ctx.prisma.student.findUnique({
        where: { id: input.studentId },
        include: { userSchool: true }
      });

      if (!student || student.schoolId !== schoolId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "دانش‌آموز یافت نشد." });
      }

      const duplicateUser = await ctx.prisma.user.findFirst({
        where: {
          OR: [{ nationalCode: input.nationalCode }, { email: input.email }],
          id: { not: student.userId }
        }
      });

      if (duplicateUser) {
        throw new TRPCError({ code: "CONFLICT", message: "کدملی یا ایمیل وارد شده متعلق به شخص دیگری است." });
      }

      // بررسی یکتا بودن شماره دانش‌آموزی در این مدرسه (در زمان آپدیت)
      const duplicateStudentNumber = await ctx.prisma.student.findFirst({
        where: {
          schoolId,
          studentNumber: input.studentNumber,
          id: { not: student.id }
        }
      });

      if (duplicateStudentNumber) {
        throw new TRPCError({ code: "CONFLICT", message: "این شماره دانش‌آموزی قبلاً برای شخص دیگری ثبت شده است." });
      }

      return await ctx.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: student.userId },
          data: { fullName: input.fullName, nationalCode: input.nationalCode, email: input.email, phone: input.phone || null }
        });

        await tx.userSchool.update({
          where: { id: student.userSchool.id },
          data: { status: input.status, leftAt: input.status === "left" ? new Date() : null }
        });

        await tx.student.update({
          where: { id: student.id },
          data: { studentNumber: input.studentNumber }
        });

        return { success: true };
      });
    }),

  // ==========================================
  // 4. Delete
  // ==========================================
  delete: tenantProcedure
    .input(
      z.object({
        studentIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.permissions.includes(PERMISSIONS.IDENTITY.STUDENT_DELETE)) {
        throw appError({ code: "FORBIDDEN", appCode: "MISSING_PERMISSION", params: { permission: PERMISSIONS.IDENTITY.STUDENT_DELETE } });
      }
      const { studentIds } = input;
      const schoolId = ctx.activeSchoolId;

      const currentUserId = ctx.authSession?.user?.id;

      if (studentIds.length === 0) return { success: true, count: 0 };

      const studentsToDelete = await ctx.prisma.student.findMany({
        where: { id: { in: studentIds }, schoolId, deletedAt: null },
      });

      if (currentUserId) {
        const selfDelete = studentsToDelete.find(s => s.userId === currentUserId);
        if (selfDelete) {
          throw new TRPCError({ code: "FORBIDDEN", message: "شما نمی‌توانید حساب کاربری خودتان را حذف کنید." });
        }
      }

      const studentsWithRecords = await ctx.prisma.student.findFirst({
        where: {
          id: { in: studentsToDelete.map(s => s.id) },
          schoolId,
          OR: [
            { enrollments: { some: {} } },
            { scores: { some: {} } },
            { attendances: { some: {} } }
          ]
        }
      });

      if (studentsWithRecords) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "برخی از دانش‌آموزان انتخاب شده دارای سابقه تحصیلی هستند." });
      }

      await ctx.prisma.$transaction(async (tx) => {
        const now = new Date();
        const userIds = studentsToDelete.map(s => s.userId);

        await tx.student.updateMany({
          where: { id: { in: studentIds } },
          data: { deletedAt: now }
        });

        await tx.userSchool.updateMany({
          where: { userId: { in: userIds }, schoolId },
          data: { deletedAt: now }
        });

        await tx.userRole.deleteMany({
          where: { userId: { in: userIds }, schoolId }
        });
      });

      return { success: true, count: studentsToDelete.length };
    }),
});

