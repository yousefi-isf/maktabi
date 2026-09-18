import { z } from "zod";
import { router, tenantProcedure } from "../../trpc/trpc.js";
import { PERMISSIONS } from "../../config/permissions.js";
import { appError } from "../../trpc/app-error.js";
import { Prisma, SubjectType } from "@maktabi/db";

export const subjectsRouter = router({
  list: tenantProcedure
    .input(
      z.object({
        q: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(15),
      })
    )
    .query(async ({ ctx, input }) => {
      const hasPermission =
        ctx.user.isSuperAdmin ||
        ctx.permissions.includes(PERMISSIONS.SYSTEM.FULL_ACCESS) ||
        ctx.permissions.includes(PERMISSIONS.ACADEMIC.SUBJECT_LIST);

      if (!hasPermission) {
        throw appError({
          code: "FORBIDDEN",
          appCode: "MISSING_PERMISSION",
          params: { permission: PERMISSIONS.ACADEMIC.SUBJECT_LIST },
        });
      }

      const where = {
        schoolId: ctx.activeSchoolId,
        deletedAt: null,
        ...(input.q ? { 
          OR: [
            { name: { contains: input.q, mode: "insensitive" as const } },
            { code: { contains: input.q, mode: "insensitive" as const } }
          ]
        } : {}),
      };

      const [totalItems, data] = await Promise.all([
        ctx.prisma.subject.count({ where }),
        ctx.prisma.subject.findMany({
          where,
          include: {
            subjectModules: {
              where: { deletedAt: null },
              orderBy: { orderIndex: 'asc' }
            }
          },
          orderBy: { name: "asc" },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
      ]);

      const totalPages = Math.ceil(totalItems / input.limit);
      return {
        data,
        meta: {
          totalItems,
          totalPages,
          hasNextPage: input.page < totalPages,
          hasPrevPage: input.page > 1,
        },
      };
    }),

  create: tenantProcedure
    .input(
      z.object({
        name: z.string().min(1, "نام درس الزامی است"),
        code: z.string().min(1, "کد درس الزامی است"),
        subjectType: z.nativeEnum(SubjectType, {
          message: "نوع درس نامعتبر است",
        }),
        defaultUnit: z.number().min(0, "تعداد واحد باید مثبت باشد"),
        modules: z.array(z.object({
          id: z.string().uuid().optional(),
          title: z.string().min(1, "عنوان پودمان الزامی است"),
          code: z.string().optional().nullable(),
          orderIndex: z.number().int().min(1),
          weight: z.number().min(0)
        })).optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const hasPermission =
        ctx.user.isSuperAdmin ||
        ctx.permissions.includes(PERMISSIONS.SYSTEM.FULL_ACCESS) ||
        ctx.permissions.includes(PERMISSIONS.ACADEMIC.SUBJECT_CREATE);

      if (!hasPermission) {
        throw appError({
          code: "FORBIDDEN",
          appCode: "MISSING_PERMISSION",
          params: { permission: PERMISSIONS.ACADEMIC.SUBJECT_CREATE },
        });
      }

      const newSubject = await ctx.prisma.subject.create({
        data: {
          schoolId: ctx.activeSchoolId,
          name: input.name,
          code: input.code,
          subjectType: input.subjectType,
          defaultUnit: input.defaultUnit,
          ...(input.subjectType === 'modular' && input.modules?.length ? {
            subjectModules: {
              create: input.modules.map(m => ({
                schoolId: ctx.activeSchoolId,
                title: m.title,
                code: m.code,
                orderIndex: m.orderIndex,
                weight: m.weight
              }))
            }
          } : {})
        },
      });

      return newSubject;
    }),

  update: tenantProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1, "نام درس الزامی است"),
        code: z.string().min(1, "کد درس الزامی است"),
        subjectType: z.nativeEnum(SubjectType, {
          message: "نوع درس نامعتبر است",
        }),
        defaultUnit: z.number().min(0, "تعداد واحد باید مثبت باشد"),
        modules: z.array(z.object({
          id: z.string().uuid().optional(),
          title: z.string().min(1, "عنوان پودمان الزامی است"),
          code: z.string().optional().nullable(),
          orderIndex: z.number().int().min(1),
          weight: z.number().min(0)
        })).optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const hasPermission =
        ctx.user.isSuperAdmin ||
        ctx.permissions.includes(PERMISSIONS.SYSTEM.FULL_ACCESS) ||
        ctx.permissions.includes(PERMISSIONS.ACADEMIC.SUBJECT_UPDATE);

      if (!hasPermission) {
        throw appError({
          code: "FORBIDDEN",
          appCode: "MISSING_PERMISSION",
          params: { permission: PERMISSIONS.ACADEMIC.SUBJECT_UPDATE },
        });
      }

      const existingSubject = await ctx.prisma.subject.findUnique({
        where: { id: input.id },
      });

      if (!existingSubject || existingSubject.schoolId !== ctx.activeSchoolId) {
        throw appError({
          code: "NOT_FOUND",
          appCode: "SUBJECT_NOT_FOUND",
        });
      }

      const updatedSubject = await ctx.prisma.$transaction(async (tx) => {
        const subject = await tx.subject.update({
          where: { id: input.id },
          data: {
            name: input.name,
            code: input.code,
            subjectType: input.subjectType,
            defaultUnit: input.defaultUnit,
          },
        });

        if (input.subjectType === 'modular' && input.modules) {
          const incomingIds = input.modules.filter((m): m is {id: string, title: string, code?: string|null, orderIndex: number, weight: number} => !!m.id).map(m => m.id);
          
          await tx.subjectModule.updateMany({
            where: {
              subjectId: input.id,
              id: { notIn: incomingIds }
            },
            data: { deletedAt: new Date() }
          });

          for (const m of input.modules) {
            if (m.id) {
              await tx.subjectModule.update({
                where: { id: m.id },
                data: {
                  title: m.title,
                  code: m.code,
                  orderIndex: m.orderIndex,
                  weight: m.weight,
                  deletedAt: null 
                }
              });
            } else {
              await tx.subjectModule.create({
                data: {
                  schoolId: ctx.activeSchoolId,
                  subjectId: input.id,
                  title: m.title,
                  code: m.code,
                  orderIndex: m.orderIndex,
                  weight: m.weight
                }
              });
            }
          }
        } else if (input.subjectType !== 'modular') {
          await tx.subjectModule.updateMany({
            where: { subjectId: input.id },
            data: { deletedAt: new Date() }
          });
        }

        return subject;
      });

      return updatedSubject;
    }),

  delete: tenantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const hasPermission =
        ctx.user.isSuperAdmin ||
        ctx.permissions.includes(PERMISSIONS.SYSTEM.FULL_ACCESS) ||
        ctx.permissions.includes(PERMISSIONS.ACADEMIC.SUBJECT_DELETE);

      if (!hasPermission) {
        throw appError({
          code: "FORBIDDEN",
          appCode: "MISSING_PERMISSION",
          params: { permission: PERMISSIONS.ACADEMIC.SUBJECT_DELETE },
        });
      }

      const existingSubject = await ctx.prisma.subject.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: { curricula: true }
          }
        }
      });

      if (!existingSubject || existingSubject.schoolId !== ctx.activeSchoolId) {
        throw appError({
          code: "NOT_FOUND",
          appCode: "SUBJECT_NOT_FOUND" as any,
        });
      }

      if (existingSubject._count.curricula > 0) {
        throw appError({
          code: "BAD_REQUEST",
          appCode: "SUBJECT_IN_USE" as any,
        });
      }

      // Soft delete
      await ctx.prisma.subject.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });

      return { success: true };
    }),
});
