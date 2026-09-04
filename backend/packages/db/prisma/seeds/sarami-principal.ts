import consola from "consola";
import { hash } from "@node-rs/argon2";
import { prisma } from "@maktabi/db";
import { ARGON } from "../../../../src/modules/auth/auth.js";
import { createId } from "@paralleldrive/cuid2";

export interface CreateSaramiPrincipalOptions {
  fullName?: string;
  nationalCode?: string;
  email?: string;
  password?: string;
  phone?: string;
}

export async function createSaramiPrincipal(options: CreateSaramiPrincipalOptions = {}) {
  const fullName = options.fullName ?? "مدیر مدرسه حاج حسین صرامی";
  const nationalCode = options.nationalCode ?? "1270001234";
  const email = options.email ?? "sarami.admin@maktabi.ir";
  const rawPassword = options.password ?? "sarami@1234";
  const phone = options.phone ?? "09130001234";

  consola.info("شروع فرآیند ایجاد مدیر مدرسه حاج حسین صرامی...");

  // 1. پیدا کردن مدرسه حاج حسین صرامی
  const school = await prisma.school.findFirst({
    where: {
      name: "حاج حسین صرامی",
      deletedAt: null,
    },
  });

  if (!school) {
    throw new Error("مدرسه 'حاج حسین صرامی' در پایگاه داده یافت نشد!");
  }
  consola.success(`مدرسه '${school.name}' با شناسه ${school.id} یافت شد.`);

  // 2. ساخت یا بازیابی نقش «مدیر» برای این مدرسه
  let principalRole = await prisma.role.findFirst({
    where: {
      schoolId: school.id,
      name: "مدیر",
      deletedAt: null,
    },
  });

  if (!principalRole) {
    principalRole = await prisma.role.create({
      data: {
        schoolId: school.id,
        name: "مدیر",
        description: "مدیر مدرسه با دسترسی کامل به تمامی امکانات مدرسه",
        isSystem: false,
      },
    });
    consola.success(`نقش '${principalRole.name}' برای مدرسه '${school.name}' ایجاد شد.`);
  } else {
    consola.info(`نقش '${principalRole.name}' از قبل برای مدرسه وجود داشت.`);
  }

  // 3. انتساب تمامی پرمیشن‌های موجود در دیتابیس به نقش مدیر
  const allPermissions = await prisma.permission.findMany({
    where: { deletedAt: null },
  });

  if (allPermissions.length === 0) {
    consola.warn("هیچ مجوزی (Permission) در پایگاه داده یافت نشد! لطفاً ابتدا syncPermissions را اجرا کنید.");
  } else {
    let assignedCount = 0;
    for (const perm of allPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: principalRole.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: principalRole.id,
          permissionId: perm.id,
        },
      });
      assignedCount++;
    }
    consola.success(`تعداد ${assignedCount} مجوز با موفقیت به نقش '${principalRole.name}' تخصیص یافت.`);
  }

  // 4. ایجاد یا به‌روزرسانی کاربر مدیر
  const passwordHash = await hash(rawPassword, ARGON);

  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { nationalCode },
        { email },
      ],
      deletedAt: null,
    },
  });

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        fullName,
        nationalCode,
        email,
        phone,
        emailVerified: true,
        isSuperAdmin: false,
      },
    });
    consola.info(`کاربر مدیر موجود با شناسه ${user.id} به‌روزرسانی شد.`);
  } else {
    user = await prisma.user.create({
      data: {
        fullName,
        nationalCode,
        email,
        phone,
        emailVerified: true,
        isSuperAdmin: false,
      },
    });
    consola.success(`کاربر مدیر جدید با شناسه ${user.id} ایجاد شد.`);
  }

  // 5. ایجاد یا به‌روزرسانی حساب ورود با کلمه عبور (AuthAccount)
  let authAccount = await prisma.authAccount.findUnique({
    where: {
      providerId_accountId: {
        accountId: user.id,
        providerId: "credential",
      },
    },
  });

  if (authAccount) {
    await prisma.authAccount.update({
      where: { id: authAccount.id },
      data: { password: passwordHash },
    });
    consola.success("رمز عبور ورود کاربر با موفقیت به‌روزرسانی شد.");
  } else {
    await prisma.authAccount.create({
      data: {
        id: createId(),
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: passwordHash,
      },
    });
    consola.success("حساب کاربری اعتبارسنجی (AuthAccount) با رمز عبور ایجاد شد.");
  }

  // 6. عضویت فعال در مدرسه (UserSchool)
  let userSchool = await prisma.userSchool.findUnique({
    where: {
      userId_schoolId: {
        userId: user.id,
        schoolId: school.id,
      },
    },
  });

  if (!userSchool) {
    userSchool = await prisma.userSchool.create({
      data: {
        userId: user.id,
        schoolId: school.id,
        status: "active",
        isDefault: true,
        joinedAt: new Date(),
      },
    });
    consola.success(`عضویت مدیر در مدرسه '${school.name}' ایجاد شد.`);
  } else {
    userSchool = await prisma.userSchool.update({
      where: { id: userSchool.id },
      data: {
        status: "active",
        isDefault: true,
        deletedAt: null,
      },
    });
    consola.info(`عضویت مدیر در مدرسه '${school.name}' فعال‌سازی/تأیید شد.`);
  }

  // 7. انتساب نقش مدیر به کاربر در این مدرسه (UserRole)
  const existingUserRole = await prisma.userRole.findFirst({
    where: {
      userId: user.id,
      schoolId: school.id,
      roleId: principalRole.id,
    },
  });

  if (!existingUserRole) {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        schoolId: school.id,
        roleId: principalRole.id,
        academicYearId: null, // مستقل از سال تحصیلی
      },
    });
    consola.success(`نقش '${principalRole.name}' به مدیر '${user.fullName}' اختصاص یافت.`);
  } else {
    consola.info(`نقش '${principalRole.name}' از قبل به کاربر اختصاص داده شده بود.`);
  }

  consola.box(`
✔ مدیر مدرسه حاج حسین صرامی با موفقیت ساخته شد:
--------------------------------------------------
نام و نام خانوادگی: ${user.fullName}
نام کاربری (ایمیل): ${user.email}
کد ملی:            ${user.nationalCode}
کلمه عبور:         ${rawPassword}
مدرسه فعال:        ${school.name}
نقش:               ${principalRole.name} (دسترسی به تمام ${allPermissions.length} مجوز)
--------------------------------------------------
  `);

  return {
    user,
    school,
    role: principalRole,
    credentials: {
      email: user.email,
      nationalCode: user.nationalCode,
      password: rawPassword,
    },
  };
}

