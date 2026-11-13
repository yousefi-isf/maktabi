import { z } from "zod";

const moduleSchema = z.object({
	id: z.string().optional(),
	title: z.string().min(1, "عنوان پودمان الزامی است"),
	code: z.string().optional().nullable(),
	orderIndex: z
		.number({ error: "شماره پودمان باید عدد باشد" })
		.int("شماره پودمان باید عدد صحیح باشد")
		.min(1, "شماره پودمان باید حداقل ۱ باشد"),
	weight: z
		.number({ error: "ضریب باید عدد باشد" })
		.min(0, "ضریب نمی‌تواند منفی باشد"),
});

export const subjectFormSchema = z.object({
	id: z.string().optional(),
	name: z.string().min(1, "نام درس الزامی است"),
	code: z.string().min(1, "کد درس الزامی است"),
	subjectType: z.enum(["theoretical", "modular"]),
	defaultUnit: z.number().min(0, "تعداد واحد باید مثبت باشد"),
	modules: z.array(moduleSchema).optional(),
});

export type SubjectFormValues = z.infer<typeof subjectFormSchema>;
type ModuleDefaults = Omit<
	z.infer<typeof moduleSchema>,
	"orderIndex" | "weight"
> & {
	orderIndex: number | string;
	weight: number | string;
};
export type SubjectFormDefaults = Omit<
	Partial<SubjectFormValues>,
	"defaultUnit" | "modules"
> & {
	defaultUnit?: number | string;
	modules?: ModuleDefaults[];
	subjectModules?: ModuleDefaults[];
};

const numericValue = (value: number | string) =>
	typeof value === "string" && !value.trim() ? Number.NaN : Number(value);

export function getSubjectFormValues(
	defaults?: SubjectFormDefaults,
): SubjectFormValues {
	return {
		id: defaults?.id,
		name: defaults?.name ?? "",
		code: defaults?.code ?? "",
		subjectType: defaults?.subjectType ?? "theoretical",
		defaultUnit:
			defaults?.defaultUnit === undefined
				? 1
				: numericValue(defaults.defaultUnit),
		modules: (defaults?.modules ?? defaults?.subjectModules ?? []).map(
			(module) => ({
				id: module.id,
				title: module.title,
				code: module.code,
				orderIndex: numericValue(module.orderIndex),
				weight: numericValue(module.weight),
			}),
		),
	};
}
