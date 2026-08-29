import { z } from "zod";

export const baseTableSearchSchema = z.object({
	page: z.coerce.number().int().positive().catch(1).default(1),
	limit: z.coerce.number().int().positive().catch(19).default(19),
	q: z.string().catch("").default(""),
});

export type BaseTableSearchParams = z.infer<typeof baseTableSearchSchema>;
