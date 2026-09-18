import { z } from "zod";
import { observable } from "@trpc/server/observable";
import { router, tenantProcedure } from "../../trpc/trpc.js";
import { punchEvents, deviceStatuses } from "../../server.js";
import type { PunchResult } from "./punch.service.js";

export const attendanceRouter = router({
  punchLogs: router({
    // 1. Fetch today's raw punch logs for the dashboard
    list: tenantProcedure
      .input(
        z.object({
          date: z.string().optional(), // ISO date string (YYYY-MM-DD), defaults to today
        })
      )
      .query(async ({ ctx, input }) => {
        const targetDate = input.date ? new Date(input.date) : new Date();
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        return ctx.prisma.devicePunchLog.findMany({
          where: {
            schoolId: ctx.activeSchoolId,
            recordTime: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          include: {
            student: {
              include: {
                userSchool: {
                  include: {
                    user: {
                      select: { fullName: true, nationalCode: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: { recordTime: "desc" },
        });
      }),

    // History log for data table with search, filter, and pagination
    history: tenantProcedure
      .input(
        z.object({
          q: z.string().optional(),
          timeRange: z.enum(["today", "last_3_days", "last_week", "last_month"]).default("today"),
          page: z.number().int().min(1).default(1),
          limit: z.number().int().min(1).max(100).default(10),
        })
      )
      .query(async ({ ctx, input }) => {
        const { q, timeRange, page, limit } = input;
        const now = new Date();
        let startDate = new Date();
        startDate.setHours(0, 0, 0, 0);

        if (timeRange === "last_3_days") {
          startDate.setDate(startDate.getDate() - 3);
        } else if (timeRange === "last_week") {
          startDate.setDate(startDate.getDate() - 7);
        } else if (timeRange === "last_month") {
          startDate.setMonth(startDate.getMonth() - 1);
        }

        const whereClause: any = {
          schoolId: ctx.activeSchoolId,
          recordTime: {
            gte: startDate,
            lte: now,
          },
        };

        if (q && q.trim() !== "") {
          const searchStr = q.trim();
          whereClause.OR = [
            { deviceUserId: { contains: searchStr } },
            {
              student: {
                userSchool: {
                  user: {
                    OR: [
                      { fullName: { contains: searchStr } },
                      { nationalCode: { contains: searchStr } },
                    ]
                  }
                }
              }
            }
          ];
        }

        const [items, total] = await Promise.all([
          ctx.prisma.devicePunchLog.findMany({
            where: whereClause,
            skip: (page - 1) * limit,
            take: limit,
            include: {
              student: {
                include: {
                  userSchool: {
                    include: {
                      user: {
                        select: { fullName: true, nationalCode: true },
                      },
                    },
                  },
                },
              },
            },
            orderBy: { recordTime: "desc" },
          }),
          ctx.prisma.devicePunchLog.count({ where: whereClause }),
        ]);

        return { items, total, page, limit };
      }),

    // 2. Real-time subscription for live dashboard updates
    subscribe: tenantProcedure.subscription(({ ctx }) => {
      return observable<PunchResult>((emit) => {
        // Listener function that matches the schoolId
        const onPunch = (data: PunchResult & { schoolId: string }) => {
          if (data.schoolId === ctx.activeSchoolId) {
            emit.next(data);
          }
        };

        // Register the event listener
        punchEvents.on("punch", onPunch);

        // Cleanup when the client disconnects
        return () => {
          punchEvents.off("punch", onPunch);
        };
      });
    }),
  }),

  // Device connection status endpoints
  deviceStatus: router({
    // Initial fetch of current state
    current: tenantProcedure.query(({ ctx }) => {
      // Return 'unknown' if the gateway hasn't reported yet, otherwise the real status
      return deviceStatuses.get(ctx.activeSchoolId) ?? 'unknown';
    }),

    // Real-time subscription to status changes
    subscribe: tenantProcedure.subscription(({ ctx }) => {
      return observable<'connected' | 'disconnected'>((emit) => {
        const onStatusChange = (data: { schoolId: string; status: 'connected' | 'disconnected' }) => {
          if (data.schoolId === ctx.activeSchoolId) {
            emit.next(data.status);
          }
        };

        punchEvents.on("deviceStatus", onStatusChange);
        return () => {
          punchEvents.off("deviceStatus", onStatusChange);
        };
      });
    }),
  }),
});


