import { addDays, isAfter } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";

export type AccessStatus =
  | { ok: true; reason: "trial" | "subscription" | "admin" }
  | { ok: false; reason: "expired" };

export async function getAccessStatus(userId: string): Promise<AccessStatus> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, reason: "expired" };
  if (user.role === "ADMIN") return { ok: true, reason: "admin" };

  const now = new Date();
  if (isAfter(user.trialEndsAt, now)) {
    return { ok: true, reason: "trial" };
  }

  const active = await prisma.subscription.findFirst({
    where: {
      userId,
      status: "active",
      endsAt: { gt: now },
    },
    orderBy: { endsAt: "desc" },
  });

  if (active) return { ok: true, reason: "subscription" };
  return { ok: false, reason: "expired" };
}

export function trialEndFromNow() {
  return addDays(new Date(), getEnv().trialDays);
}

export async function activateSubscription(userId: string, months = 1) {
  const now = new Date();
  const endsAt = addDays(now, 30 * months);
  return prisma.subscription.create({
    data: {
      userId,
      amount: getEnv().subscriptionAmount,
      status: "active",
      startsAt: now,
      endsAt,
    },
  });
}
