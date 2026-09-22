"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { APIError } from "better-auth/api";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhone, phoneToAuthEmail } from "@/lib/phone";
import { trialEndFromNow, activateSubscription } from "@/lib/subscription";
import { parseAmount } from "@/lib/money";
import { sendReminderNow } from "@/lib/reminder-runner";
import { getEnv } from "@/lib/env";

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("Non authentifié");
  return session.user.id;
}

export async function registerAction(formData: FormData) {
  const schema = z.object({
    name: z.string().min(2),
    shopName: z.string().min(2),
    phone: z.string().min(8),
    password: z.string().min(6),
    locale: z.enum(["fr", "dyu", "mos"]).default("fr"),
  });

  const parsed = schema.safeParse({
    name: formData.get("name"),
    shopName: formData.get("shopName"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    locale: formData.get("locale") || "fr",
  });
  if (!parsed.success) return { error: "Données invalides" };

  const phone = normalizePhone(parsed.data.phone);
  const email = phoneToAuthEmail(phone);

  try {
    await auth.api.signUpEmail({
      body: {
        email,
        password: parsed.data.password,
        name: parsed.data.name,
        phone,
        shopName: parsed.data.shopName,
        locale: parsed.data.locale,
      } as never,
    });
  } catch (e) {
    if (e instanceof APIError) return { error: e.message };
    return { error: "Inscription impossible" };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        phone,
        shopName: parsed.data.shopName,
        locale: parsed.data.locale,
        trialEndsAt: trialEndFromNow(),
        role: "SHOPKEEPER",
      },
    });
    await prisma.reminderSettings.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });
  }

  return { ok: true, locale: parsed.data.locale };
}

export async function loginAction(formData: FormData) {
  const phone = normalizePhone(String(formData.get("phone") || ""));
  const password = String(formData.get("password") || "");
  if (!phone || password.length < 6) return { error: "Identifiants invalides" };

  try {
    await auth.api.signInEmail({
      body: {
        email: phoneToAuthEmail(phone),
        password,
      },
      headers: await headers(),
    });
  } catch (e) {
    if (e instanceof APIError) return { error: "Téléphone ou mot de passe incorrect" };
    return { error: "Connexion impossible" };
  }

  const user = await prisma.user.findUnique({
    where: { email: phoneToAuthEmail(phone) },
  });
  return { ok: true, locale: user?.locale ?? "fr" };
}

export async function createCustomerAction(formData: FormData) {
  const userId = await currentUserId();
  const name = String(formData.get("name") || "").trim();
  const phoneRaw = String(formData.get("phone") || "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;
  if (name.length < 2) return { error: "Nom requis" };

  const customer = await prisma.customer.create({
    data: {
      userId,
      name,
      phone: phoneRaw ? normalizePhone(phoneRaw) : null,
      notes,
    },
  });
  revalidatePath("/", "layout");
  return { ok: true, id: customer.id };
}

export async function addDebtAction(formData: FormData) {
  const userId = await currentUserId();
  const customerId = String(formData.get("customerId") || "");
  const amount = parseAmount(String(formData.get("amount") || ""));
  const reason = String(formData.get("reason") || "").trim() || null;
  if (!amount) return { error: "Montant invalide" };

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, userId },
  });
  if (!customer) return { error: "Client introuvable" };

  await prisma.debt.create({
    data: { customerId, amount, reason },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function addPaymentAction(formData: FormData) {
  const userId = await currentUserId();
  const customerId = String(formData.get("customerId") || "");
  const amount = parseAmount(String(formData.get("amount") || ""));
  const note = String(formData.get("note") || "").trim() || null;
  if (!amount) return { error: "Montant invalide" };

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, userId },
    include: { debts: true, payments: true },
  });
  if (!customer) return { error: "Client introuvable" };

  const balance =
    customer.debts.reduce((s, d) => s + d.amount, 0) -
    customer.payments.reduce((s, p) => s + p.amount, 0);
  if (amount > balance) return { error: "Le paiement dépasse le solde" };

  await prisma.payment.create({
    data: { customerId, amount, note },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveReminderSettingsAction(formData: FormData) {
  const userId = await currentUserId();
  const enabled = formData.get("enabled") === "on";
  const channel = String(formData.get("channel") || "both");
  const frequencyType = String(formData.get("frequencyType") || "weekly");
  const everyNDays = Number(formData.get("everyNDays") || 3);
  const weeklyDay = Number(formData.get("weeklyDay") || 5);
  const hour = Number(formData.get("hour") || 9);
  const minute = Number(formData.get("minute") || 0);
  const messageTemplate = String(formData.get("messageTemplate") || "").trim() || null;

  await prisma.reminderSettings.upsert({
    where: { userId },
    create: {
      userId,
      enabled,
      channel,
      frequencyType,
      everyNDays,
      weeklyDay,
      hour,
      minute,
      messageTemplate,
    },
    update: {
      enabled,
      channel,
      frequencyType,
      everyNDays,
      weeklyDay,
      hour,
      minute,
      messageTemplate,
    },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function remindNowAction(customerId: string) {
  const userId = await currentUserId();
  try {
    const result = await sendReminderNow({ userId, customerId, channel: "both" });
    return {
      ok: true,
      dryRun: result.dryRun === true,
      message: result.message,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Échec du rappel" };
  }
}

export async function submitPaymentProofAction(formData: FormData) {
  const userId = await currentUserId();
  const method = String(formData.get("method") || "");
  const reference = String(formData.get("reference") || "").trim();
  const note = String(formData.get("note") || "").trim() || null;

  if (!["ORANGE_MONEY", "WAVE", "MOOV"].includes(method)) {
    return { error: "Moyen de paiement invalide" };
  }
  if (reference.length < 3) return { error: "Référence requise" };

  const pending = await prisma.paymentProof.findFirst({
    where: { userId, status: "pending" },
  });
  if (pending) return { error: "Une preuve est déjà en attente" };

  const subscription = await prisma.subscription.create({
    data: {
      userId,
      amount: getEnv().subscriptionAmount,
      status: "pending",
    },
  });

  await prisma.paymentProof.create({
    data: {
      userId,
      subscriptionId: subscription.id,
      method,
      reference,
      note,
      status: "pending",
    },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function reviewPaymentProofAction(proofId: string, decision: "approve" | "reject") {
  const userId = await currentUserId();
  const admin = await prisma.user.findUnique({ where: { id: userId } });
  if (!admin || admin.role !== "ADMIN") return { error: "Accès refusé" };

  const proof = await prisma.paymentProof.findUnique({
    where: { id: proofId },
    include: { subscription: true },
  });
  if (!proof || proof.status !== "pending") return { error: "Preuve introuvable" };

  if (decision === "reject") {
    await prisma.$transaction([
      prisma.paymentProof.update({
        where: { id: proofId },
        data: { status: "rejected", reviewedAt: new Date(), reviewedBy: admin.id },
      }),
      ...(proof.subscriptionId
        ? [
            prisma.subscription.update({
              where: { id: proof.subscriptionId },
              data: { status: "rejected" },
            }),
          ]
        : []),
    ]);
  } else {
    const sub = await activateSubscription(proof.userId, 1);
    await prisma.$transaction([
      prisma.paymentProof.update({
        where: { id: proofId },
        data: {
          status: "approved",
          reviewedAt: new Date(),
          reviewedBy: admin.id,
          subscriptionId: sub.id,
        },
      }),
      ...(proof.subscriptionId
        ? [
            prisma.subscription.update({
              where: { id: proof.subscriptionId },
              data: { status: "rejected" },
            }),
          ]
        : []),
    ]);
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
