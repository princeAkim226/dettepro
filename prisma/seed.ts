import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "../src/lib/prisma";
import { phoneToAuthEmail, normalizePhone } from "../src/lib/phone";
import { getEnv } from "../src/lib/env";
import { trialEndFromNow } from "../src/lib/subscription";

async function main() {
  const env = getEnv();
  if (!env.adminPassword) {
    console.log("ADMIN_PASSWORD non défini — seed admin ignoré");
    return;
  }

  const phone = normalizePhone(env.adminPhone);
  const email = phoneToAuthEmail(phone);
  const passwordHash = await hashPassword(env.adminPassword);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: "ADMIN",
        phone,
        shopName: "DettePro Admin",
        name: env.adminName,
      },
    });
    console.log("Admin mis à jour:", phone);
    return;
  }

  const user = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email,
      name: env.adminName,
      emailVerified: true,
      phone,
      shopName: "DettePro Admin",
      locale: "fr",
      role: "ADMIN",
      trialEndsAt: trialEndFromNow(),
      accounts: {
        create: {
          id: crypto.randomUUID(),
          accountId: email,
          providerId: "credential",
          password: passwordHash,
        },
      },
    },
  });

  console.log("Admin créé:", user.phone, user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
