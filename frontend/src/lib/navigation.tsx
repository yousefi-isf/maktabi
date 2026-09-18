import {
	Activity,
	Book,
	BookOpenIcon,
	BotIcon,
	CalendarDays,
	ClipboardList,
	Clock,
	FileUp,
	FrameIcon,
	GraduationCap,
	LayoutDashboard,
	Library,
	Presentation,
	School,
	Settings2Icon,
	Trophy,
	UserKey,
	UserShield,
	Users,
} from "lucide-react";
import type { PermissionNavItem } from "./permissions";

export const navigationItems = [
	{
		title: "پیشخوان",
		url: "/",
		icon: <LayoutDashboard />,
	},
	{
		title: "مدیریت",
		icon: <Settings2Icon />,
		items: [
			{
				title: "مدارس",
				url: "/schools",
				required: "system.full_access",
				icon: <School />,
			},
			{
				title: "کاربران",
				url: "/allusers",
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
				icon: <CalendarDays />,
				required: {
					anyOf: [
						"academic.year.list",
						"academic.year.create",
						"academic.year.update",
						"academic.year.delete",
					],
				},
			},
			{
				title: "دانش آموزان",
				url: "/students",
				icon: <GraduationCap />,
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
				url: "/import",
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
				url: "/rankings",
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
				url: "/fieldofstudy",
				icon: <Library />,
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
				title: "پایه‌های تحصیلی",
				url: "/grade-levels",
				icon: <GraduationCap />,
				required: {
					anyOf: [
						"academic.grade.list",
						"academic.grade.create",
						"academic.grade.update",
					],
				},
			},
			{
				title: "کلاس‌ها",
				url: "/classes",
				icon: <Presentation />,
				required: {
					anyOf: [
						"academic.class.list",
						"academic.class.create",
						"academic.class.delete",
						"academic.class.update",
					],
				},
			},
			{
				title: "دروس",
				url: "/subjects",
				icon: <Book />,
				required: {
					anyOf: [
						"academic.subject.list",
						"academic.subject.create",
						"academic.subject.delete",
						"academic.subject.update",
					],
				},
			},
			{
				title: "امتحانات",
				url: "/exams",
				icon: <ClipboardList />,
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
		icon: <FrameIcon />,
		items: [
			{
				title: "داشبورد زنده",
				url: "/attendance",
				exact: true,
				icon: <Activity />,
				required: {
					anyOf: ["attendance.record.read", "attendance.record.read.own"],
				},
			},
			{
				title: "تاریخچه ترددها",
				url: "/attendance/history",
				icon: <Clock />,
				required: {
					anyOf: ["attendance.record.read", "attendance.record.read.own"],
				},
			},
		],
	},
	{
		title: "راهنما",
		url: "/help",
		icon: <BookOpenIcon />,
	},
] as const satisfies readonly PermissionNavItem[];
