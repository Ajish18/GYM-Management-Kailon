import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = process.env.PLATFORM_ADMIN_EMAIL;
  const password = process.env.PLATFORM_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log(
      "Skipping platform admin bootstrap — set PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD in .env to create one.",
    );
  } else {
    const existing = await db.user.findFirst({ where: { role: "PLATFORM_SUPER_ADMIN", email } });
    if (existing) {
      console.log(`Platform admin ${email} already exists.`);
    } else {
      const passwordHash = await bcrypt.hash(password, 12);
      await db.user.create({
        data: {
          role: "PLATFORM_SUPER_ADMIN",
          name: "Platform Admin",
          email,
          passwordHash,
          status: "ACTIVE",
        },
      });
      console.log(`Created platform admin: ${email}`);
    }
  }

  const plans = [
    {
      code: "starter",
      name: "Starter",
      priceMonthly: 999,
      priceYearly: 9999,
      maxMembers: 150,
      maxTrainers: 3,
    },
    {
      code: "growth",
      name: "Growth",
      priceMonthly: 2499,
      priceYearly: 24999,
      maxMembers: 600,
      maxTrainers: 10,
    },
    {
      code: "pro",
      name: "Pro",
      priceMonthly: 4999,
      priceYearly: 49999,
      maxMembers: null,
      maxTrainers: null,
    },
  ];

  for (const plan of plans) {
    await db.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: {},
      create: plan,
    });
  }
  console.log("Subscription plan catalog seeded.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
