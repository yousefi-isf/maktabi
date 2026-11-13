import { observable } from "@trpc/server/observable";
import { z } from "zod";
import { currentDeviceStatus, punchEvents } from "./events.js";
import { router, tenantProcedure } from "../../trpc/trpc.js";
import { PERMISSIONS } from "../../config/permissions.js";
import { requirePermission, tehranDay, tehranToday } from "./policy.js";
import { classroomRouter } from "./classroom-router.js";
import type { PunchResult } from "./punch.service.js";

const overviewProcedure = tenantProcedure.use(({ ctx, next }) => {
	requirePermission(ctx, PERMISSIONS.ATTENDANCE.RECORD_READ);
	return next({ ctx });
});

export const attendanceRouter = router({
	classroom: classroomRouter,
	punchLogs: router({
		/* ―――――――――――― 1. Fetch today's raw punch logs for the dashboard ――――――――――― */
		list: overviewProcedure
			.input(
				z.object({
					date: z.string().optional(), // ISO date string (YYYY-MM-DD), defaults to today
				}),
			)
			.query(async ({ ctx, input }) => {
				const { start: startOfDay, end: endOfDay } = tehranDay(
					input.date ?? tehranToday(),
				);

				return ctx.prisma.devicePunchLog.findMany({
					where: {
						schoolId: ctx.activeSchoolId,
						recordTime: {
							gte: startOfDay,
							lt: endOfDay,
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

		/* ―― 2. Attendance summary: present vs absent students for a specific date ― */
		todaySummary: overviewProcedure
			.input(
				z
					.object({
						date: z
							.string()
							.regex(/^\d{4}-\d{2}-\d{2}$/)
							.optional(),
					})
					.optional(),
			)
			.query(async ({ ctx, input }) => {
				const tehranDateStr = input?.date ?? tehranToday();
				const { start: startOfDayUtc, end: endOfDayUtc } =
					tehranDay(tehranDateStr);

				// 1. All active students in this school
				const allStudents = await ctx.prisma.student.findMany({
					where: { schoolId: ctx.activeSchoolId, deletedAt: null },
					select: {
						id: true,
						userSchool: {
							select: {
								user: { select: { fullName: true, nationalCode: true } },
							},
						},
					},
				});

				// 2. Students who punched on this date (distinct by studentId)
				const punches = await ctx.prisma.devicePunchLog.findMany({
					where: {
						schoolId: ctx.activeSchoolId,
						studentId: { not: null },
						recordTime: { gte: startOfDayUtc, lt: endOfDayUtc },
					},
					select: { studentId: true, recordTime: true },
					distinct: ["studentId"],
					orderBy: { recordTime: "asc" },
				});

				const presentIds = new Set(punches.map((p) => p.studentId!));
				// Map studentId → first punch time (already ordered asc, so first hit = earliest)
				const firstPunchMap = new Map(
					punches.map((p) => [p.studentId!, p.recordTime]),
				);

				const present = allStudents
					.filter((s) => presentIds.has(s.id))
					.map((s) => ({
						studentId: s.id,
						fullName: s.userSchool.user.fullName,
						nationalCode: s.userSchool.user.nationalCode,
						firstPunchAt: firstPunchMap.get(s.id)!,
					}));

				const absent = allStudents
					.filter((s) => !presentIds.has(s.id))
					.map((s) => ({
						studentId: s.id,
						fullName: s.userSchool.user.fullName,
						nationalCode: s.userSchool.user.nationalCode,
					}));

				const confirmations = await ctx.prisma.attendance.findMany({
					where: {
						schoolId: ctx.activeSchoolId,
						attDate: { gte: startOfDayUtc, lt: endOfDayUtc },
						periodNo: null,
						deletedAt: null,
						confirmedAt: { not: null },
						studentId: { in: allStudents.map((student) => student.id) },
					},
					select: { studentId: true, status: true },
					distinct: ["studentId"],
				});

				return {
					date: tehranDateStr,
					totalStudents: allStudents.length,
					confirmedPresentCount: confirmations.filter(
						(record) => record.status === "present" || record.status === "late",
					).length,
					confirmedAbsentCount: confirmations.filter(
						(record) =>
							record.status === "absent" || record.status === "excused",
					).length,
					pendingConfirmationCount: allStudents.length - confirmations.length,
					presentCount: present.length,
					absentCount: absent.length,
					present,
					absent,
				};
			}),

		/* ―――― 3. History log for data table with search, filter, and pagination ――― */
		history: overviewProcedure
			.input(
				z.object({
					q: z.string().optional(),
					timeRange: z
						.enum(["today", "last_3_days", "last_week", "last_month"])
						.default("today"),
					page: z.number().int().min(1).default(1),
					limit: z.number().int().min(1).max(100).default(10),
				}),
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
										],
									},
								},
							},
						},
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

		/* ―――――――――― 4. Real-time subscription for live dashboard updates ―――――――――― */
		subscribe: overviewProcedure.subscription(({ ctx }) => {
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

	/* ――――――――――――――――――― Device connection status endpoints ――――――――――――――――――― */
	deviceStatus: router({
		/* ―――――――――――――――――――― 1. Initial fetch of current state ――――――――――――――――――― */
		current: overviewProcedure.query(({ ctx }) => {
			// Return 'unknown' if the gateway hasn't reported yet, otherwise the real status
			return currentDeviceStatus(ctx.activeSchoolId);
		}),

		/* ――――――――――――――― 2. Real-time subscription to status changes ―――――――――――――― */
		subscribe: overviewProcedure.subscription(({ ctx }) => {
			return observable<"connected" | "disconnected">((emit) => {
				const onStatusChange = (data: {
					schoolId: string;
					status: "connected" | "disconnected";
				}) => {
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
