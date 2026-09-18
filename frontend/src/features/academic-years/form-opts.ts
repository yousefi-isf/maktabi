import { formOptions } from "@tanstack/react-form";

export interface AcademicYearFormData {
	title: string;
	startDate: string;
	endDate: string;
	isActive: boolean;
}

export const defaultAcademicYearValues: AcademicYearFormData = {
	title: "",
	startDate: "",
	endDate: "",
	isActive: false,
};

export const academicYearFormOpts = formOptions({
	defaultValues: defaultAcademicYearValues,
});

