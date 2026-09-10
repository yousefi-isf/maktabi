import {
	BookOpenIcon,
	BotIcon,
	FrameIcon,
	School,
	Settings2Icon,
	UserKey,
	UserShield,
	Users,
	FileUp,
	Trophy,
} from "lucide-react";
import type { PermissionNavItem } from "./permissions";

export const navigationItems = [
	{
		title: "پیشخوان",
		url: "/",
	},
	{
		title: "مدیریت",
		icon: <Settings2Icon />,
		items: [
			{
				title: "مدارس",
				url: "/schools/",
				required: "system.full_access",
				icon: <School />,
			},
			{
				title: "کاربران",
				url: "/allusers/",
				required: "system.full_access",
				icon: <Users />,
			},
			{
				title: "نقش‌ها",
				url: "/roles",
				required: "identity.role.list",
				icon: <UserShield />,
			},
			{
				title: "مجوزها",
				url: "/permissions",
				required: "identity.permission.list",
				icon: <UserKey />,
			},
		],
	},
	{
		title: "بخش آموزشی",
		icon: <BotIcon />,
		items: [
			{
				title: "سال‌های تحصیلی",
				url: "/academic-years",
				required: {
					anyOf: ["academic.year.create", "academic.year.delete"],
				},
			},
			{
				title: "دانش آموزان",
				url: "/students/",
				required: {
					anyOf: [
						"identity.student.list",
						"identity.student.create",
						"identity.student.delete",
						"identity.student.update",
					],
				},
			},
			{
				title: "بارگذاری کارنامه",
				url: "/students/import",
				required: {
					anyOf: [
						"importer.report_card.preview",
						"importer.report_card.execute",
					],
				},
				icon: <FileUp />,
			},
			{
				title: "رتبه‌بندی دانش‌آموزان",
				url: "/students/rankings",
				required: {
					anyOf: [
						"identity.student.list",
						"assessment.score.read",
					],
				},
				icon: <Trophy />,
			},
			{
				title: "رشته‌های تحصیلی",
				url: "/fieldofstudy/",
				required: {
					anyOf: [
						"academic.field.list",
						"academic.field.create",
						"academic.field.delete",
						"academic.field.update",
					],
				},
			},
			{
				title: "امتحانات",
				url: "/exams",
				required: {
					anyOf: [
						"academic.exam.read",
						"academic.exam.read.own",
						"academic.exam.create",
					],
				},
			},
		],
	},
	{
		title: "حضور و غیاب",
		url: "/attendance",
		icon: <FrameIcon />,
		required: {
			anyOf: ["attendance.record.read", "attendance.record.read.own"],
		},
	},
	{
		title: "راهنما",
		url: "/help",
		icon: <BookOpenIcon />,
	},
] as const satisfies readonly PermissionNavItem[];
