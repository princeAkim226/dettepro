import { createHmac, timingSafeEqual } from "crypto";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { activateSubscription } from "@/lib/subscription";

const TOLERANCE_SECONDS = 300;

export type SaspayWebhookEnvelope = {
  event: string;
  data: {
    id?: string;
    reference?: string;
    type?: string;
    status?: string;
    amount?: string | number;
    net_amount?: string | number;
    currency?: string;
    msisdn?: string;
    country?: string;
    network?: string;
  };
};

export function verifySaspaySignature(
  rawBody: string,
  signatureHeader: string | null,
  timestampHeader: string | null,
): boolean {
  const secret = getEnv().saspayWebhookSecret;
  if (!secret || !signatureHeader || !timestampHeader) return false;

  const ts = Number(timestampHeader);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestampHeader}.${rawBody}`)
    .digest("hex");

  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function parseAmount(value: string | number | undefined): number {
  if (value == null) return 0;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Normalise msisdn SasPay (ex. 22670… / 22990…) vers +E.164. */
export function normalizeMsisdn(msisdn: string): string {
  const digits = msisdn.replace(/\D/g, "");
  if (!digits) return "";
  return normalizePhone(digits.startsWith("+") ? digits : `+${digits}`);
}

/**
 * Active l'abonnement après un paiement SasPay réussi.
 * Matching : numéro payeur = téléphone du compte DettePro + montant >= abo.
 */
export async function activateFromSaspaySuccess(data: SaspayWebhookEnvelope["data"]) {
  const txnId = data.id || data.reference;
  if (!txnId) {
    return { ok: false as const, error: "Transaction sans id" };
  }

  const already = await prisma.paymentProof.findFirst({
    where: { method: "SASPAY", reference: String(txnId) },
  });
  if (already?.status === "approved") {
    return { ok: true as const, duplicate: true, userId: already.userId };
  }

  const amount = parseAmount(data.amount) || parseAmount(data.net_amount);
  const expected = getEnv().subscriptionAmount;
  if (amount + 0.001 < expected) {
    return {
      ok: false as const,
      error: `Montant insuffisant (${amount} < ${expected})`,
    };
  }

  const currency = String(data.currency || "XOF").toUpperCase();
  if (currency !== "XOF") {
    return { ok: false as const, error: `Devise non supportée: ${currency}` };
  }

  const msisdn = data.msisdn ? normalizeMsisdn(data.msisdn) : "";
  if (!msisdn) {
    return {
      ok: false as const,
      error: "Numéro payeur absent — impossible de lier au compte",
    };
  }

  // Cherche le compte dont le téléphone correspond (avec/sans +)
  const candidates = [msisdn, msisdn.replace(/^\+/, ""), normalizePhone(msisdn)];
  const user = await prisma.user.findFirst({
    where: {
      OR: candidates.flatMap((p) => [
        { phone: p },
        { phone: p.replace(/^\+/, "") },
        { phone: normalizePhone(p) },
      ]),
    },
  });

  if (!user) {
    return {
      ok: false as const,
      error: `Aucun compte pour le numéro ${msisdn}`,
    };
  }

  const sub = await activateSubscription(user.id, 1);

  if (already) {
    await prisma.paymentProof.update({
      where: { id: already.id },
      data: {
        status: "approved",
        reviewedAt: new Date(),
        reviewedBy: "saspay-webhook",
        subscriptionId: sub.id,
        note: `auto ${data.reference || txnId}`,
      },
    });
  } else {
    await prisma.paymentProof.create({
      data: {
        userId: user.id,
        subscriptionId: sub.id,
        method: "SASPAY",
        reference: String(txnId),
        note: `auto webhook ${data.reference || ""}`.trim(),
        status: "approved",
        reviewedAt: new Date(),
        reviewedBy: "saspay-webhook",
      },
    });
  }

  return { ok: true as const, duplicate: false, userId: user.id };
}
