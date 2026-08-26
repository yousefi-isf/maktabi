import { prisma } from "@maktabi/db";
import { ALL_PERMISSIONS, PERMISSIONS } from "../../config/permissions.js";

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

// export function getAccessSummary(
// 	membership: NonNullable<
// 		Awaited<ReturnType<typeof getActiveMembershipAccess>>
// 	>,
// ) {
// 	const roles = [
// 		...new Set(membership.userRoles.map(({ role }) => role.name)),
// 	].sort();
// 	const assignedPermissions = new Set(
// 		membership.userRoles.flatMap(({ role }) =>
// 			role.rolePermissions.map(({ permission }) => permission.code),
// 		),
// 	);
// 	const permissions = assignedPermissions.has(PERMISSIONS.SYSTEM.FULL_ACCESS)
// 		? [...ALL_PERMISSIONS].sort()
// 		: [...assignedPermissions].sort();

// 	return { roles, permissions };
// }

export type Membership = NonNullable<
	Awaited<ReturnType<typeof getActiveMembershipAccess>>
>;

export const SUPER_ADMIN_ACCESS = {
	roles: ["super_admin"],
	permissions: [...ALL_PERMISSIONS],
};

export function getAccessSummary(membership: Membership) {
	const roles = [
		...new Set(membership.userRoles.map(({ role }) => role.name)),
	].sort();
	const assignedPermissions = new Set(
		membership.userRoles.flatMap(({ role }) =>
			role.rolePermissions.map(({ permission }) => permission.code),
		),
	);
	const permissions = assignedPermissions.has(PERMISSIONS.SYSTEM.FULL_ACCESS)
		? [...ALL_PERMISSIONS].sort()
		: [...assignedPermissions].sort();

	return { roles, permissions };
}
