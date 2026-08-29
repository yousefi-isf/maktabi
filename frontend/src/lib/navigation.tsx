import {
	BookOpenIcon,
	BotIcon,
	FrameIcon,
	House,
	School,
	Settings2Icon,
	UserKey,
	UserShield,
	Users,
} from "lucide-react";
import type { PermissionNavItem } from "./permissions";

export const navigationItems = [
	{
		title: "پیشخوان",
		url: "/",
		// icon: <House />
	},
	{
		title: "مدیریت",
		icon: <Settings2Icon />,
		items: [
			{
				title: "مدارس",
				url: "/schools",
				required: "identity.school.list",
				icon: <School />
			},
			{
				title: "کاربران",
				url: "/users",
				required: "identity.user.list",
				icon: <Users />
			},
			// {
			// 	title: "دعوت کاربر",
			// 	url: "/users/invite",
			// 	required: "identity.user.invite",

			// },
			{
				title: "نقش‌ها",
				url: "/roles",
				required: "identity.role.list",
				icon: <UserShield />
			},
			{
				title: "مجوزها",
				url: "/permissions",
				required: "identity.permission.list",
				icon: <UserKey />
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
				title: "ایجاد سال تحصیلی",
				url: "/academic-years/create",
				required: "academic.year.create",
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
			{
				title: "ایجاد امتحان",
				url: "/exams/create",
				required: "academic.exam.create",
			},
			{
				title: "انتشار امتحان",
				url: "/exams/publish",
				required: "academic.exam.publish",
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
