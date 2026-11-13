import { z } from "zod";

export const baseTableSearchSchema = z.object({
	page: z.coerce.number({ error: "شماره صفحه نامعتبر است" }).int({ message: "شماره صفحه باید عدد صحیح باشد" }).positive({ message: "شماره صفحه باید مثبت باشد" }).catch(1).default(1),
	limit: z.coerce.number({ error: "تعداد نامعتبر است" }).int({ message: "تعداد باید عدد صحیح باشد" }).positive({ message: "تعداد باید مثبت باشد" }).catch(19).default(19),
	q: z.string({ error: "متن جستجو نامعتبر است" }).catch("").default(""),
});

export type BaseTableSearchParams = z.infer<typeof baseTableSearchSchema>;
