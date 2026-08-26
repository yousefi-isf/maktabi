import type { PermissionCode } from "../../config/permissions.js";
import { appError } from "../../trpc/app-error.js";
import { platformProcedure, router } from "../../trpc/trpc.js";

const LIST_PERMISSION_PERMISSION: PermissionCode = "identity.permission.list";

export const permissionsRouter = router({
	list: platformProcedure.query(async ({ ctx }) => {
		if (!ctx.permissions.includes(LIST_PERMISSION_PERMISSION)) {
			throw appError({
				code: "FORBIDDEN",
				appCode: "MISSING_PERMISSION",
				params: { permission: LIST_PERMISSION_PERMISSION },
			});
		}

		return ctx.prisma.permission.findMany({
			where: {
				deletedAt: null,
			},
			select: {
				id: true,
				code: true,
				description: true,
			},
		});
	}),
});
