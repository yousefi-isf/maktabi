import { z } from "zod";

export const baseTableSearchSchema = z.object({
	page: z.coerce.number({ invalid_type_error: "شماره صفحه نامعتبر است" }).int({ message: "شماره صفحه باید عدد صحیح باشد" }).positive({ message: "شماره صفحه باید مثبت باشد" }).catch(1).default(1),
	limit: z.coerce.number({ invalid_type_error: "تعداد نامعتبر است" }).int({ message: "تعداد باید عدد صحیح باشد" }).positive({ message: "تعداد باید مثبت باشد" }).catch(19).default(19),
	q: z.string({ invalid_type_error: "متن جستجو نامعتبر است" }).catch("").default(""),
});

export type BaseTableSearchParams = z.infer<typeof baseTableSearchSchema>;
