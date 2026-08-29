import { type Prisma } from "@maktabi/db";

export type AuditLogAction = "create" | "update" | "delete" | (string & {});

export async function logAudit(
	tx: Prisma.TransactionClient,
	data: {
		userId: string;
		schoolId?: string | null;
		entityName: string;
		entityId: string;
		action: AuditLogAction;
		oldValue?: unknown;
		newValue?: unknown;
	},
) {
	return tx.auditLog.create({
		data: {
			userId: data.userId,
			schoolId: data.schoolId ?? null,
			entityName: data.entityName,
			entityId: data.entityId,
			action: data.action,
			oldValue: data.oldValue !== undefined ? JSON.parse(JSON.stringify(data.oldValue)) : null,
			newValue: data.newValue !== undefined ? JSON.parse(JSON.stringify(data.newValue)) : null,
		},
	});
}

export async function logAuditMany(
	tx: Prisma.TransactionClient,
	logs: {
		userId: string;
		schoolId?: string | null;
		entityName: string;
		entityId: string;
		action: AuditLogAction;
		oldValue?: unknown;
		newValue?: unknown;
	}[],
) {
	if (logs.length === 0) return;

	return tx.auditLog.createMany({
		data: logs.map((data) => ({
			userId: data.userId,
			schoolId: data.schoolId ?? null,
			entityName: data.entityName,
			entityId: data.entityId,
			action: data.action,
			oldValue: data.oldValue !== undefined ? JSON.parse(JSON.stringify(data.oldValue)) : null,
			newValue: data.newValue !== undefined ? JSON.parse(JSON.stringify(data.newValue)) : null,
		})),
	});
}
