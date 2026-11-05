import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

type MetaStatus = {
  id?: string;
  status?: string;
  errors?: { code?: number; title?: string; message?: string }[];
};

/** Vérifie l'en-tête X-Hub-Signature-256 envoyé par Meta. */
export function isValidMetaSignature(rawBody: string, header: string | null, secret: string) {
  if (!header) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function failureReason(code?: number) {
  if (code === 131047) return "window";
  if (code === 131026) return "undeliverable";
  if (code === 131049 || code === 130472) return "limited";
  return "other";
}

async function applyStatus({ id, status, errors }: MetaStatus) {
  if (!id) return;

  // Les statuts peuvent arriver dans le désordre : on ne revient jamais en arrière
  if (status === "delivered") {
    await prisma.reminderLog.updateMany({
      where: { providerMessageId: id, status: "sent" },
      data: { status: "delivered" },
    });
  } else if (status === "read") {
    await prisma.reminderLog.updateMany({
      where: { providerMessageId: id, status: { in: ["sent", "delivered"] } },
      data: { status: "read" },
    });
  } else if (status === "failed") {
    const error = errors?.[0];
    await prisma.reminderLog.updateMany({
      where: { providerMessageId: id, status: { in: ["sent", "delivered"] } },
      data: {
        status: "failed",
        failureReason: failureReason(error?.code),
        error: error ? `${error.code ?? "?"}: ${error.message ?? error.title ?? ""}` : null,
      },
    });
  }
}

/** Applique les statuts de livraison contenus dans une notification Meta. */
export async function applyMetaStatuses(payload: unknown) {
  const entries = (payload as { entry?: { changes?: { value?: { statuses?: MetaStatus[] } }[] }[] })
    ?.entry;
  if (!Array.isArray(entries)) return;

  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      for (const status of change.value?.statuses ?? []) {
        await applyStatus(status);
      }
    }
  }
}
