import { prisma } from "@maktabi/db";

export async function getActiveMembershipAccess(
	userId: string,
	schoolId: string,
) {
	return prisma.userSchool.findFirst({
		where: {
			userId,
			schoolId,
			status: "active",
			deletedAt: null,
			user: { deletedAt: null },
			school: { deletedAt: null },
		},
		include: {
			school: true,
			userRoles: {
				where: {
					role: {
						deletedAt: null,
						OR: [{ schoolId }, { schoolId: null }],
					},
				},
				include: {
					role: {
						include: {
							rolePermissions: {
								where: { permission: { deletedAt: null } },
								include: { permission: true },
							},
						},
					},
				},
			},
		},
	});
}

export function getAccessSummary(
	membership: NonNullable<
		Awaited<ReturnType<typeof getActiveMembershipAccess>>
	>,
) {
	const roles = [
		...new Set(membership.userRoles.map(({ role }) => role.name)),
	].sort();
	const permissions = [
		...new Set(
			membership.userRoles.flatMap(({ role }) =>
				role.rolePermissions.map(({ permission }) => permission.code),
			),
		),
	].sort();

	return { roles, permissions };
}
