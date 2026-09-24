import { setRequestLocale, getTranslations } from "next-intl/server";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { requireUser } from "@/lib/session";
import { getAccessStatus } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { BillingProofForm } from "@/components/Forms";

export default async function BillingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser();
  const access = await getAccessStatus(user.id);
  const t = await getTranslations("billing");
  const env = getEnv();

  const active = await prisma.subscription.findFirst({
    where: { userId: user.id, status: "active", endsAt: { gt: new Date() } },
    orderBy: { endsAt: "desc" },
  });
  const pending = await prisma.paymentProof.findFirst({
    where: { userId: user.id, status: "pending" },
  });

  let statusText = t("expired");
  if (access.ok && access.reason === "trial") {
    statusText = t("trial", { date: format(user.trialEndsAt, "d MMM yyyy", { locale: fr }) });
  } else if (active?.endsAt) {
    statusText = t("active", { date: format(active.endsAt, "d MMM yyyy", { locale: fr }) });
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>{t("title")}</h1>
      <div className="stat" style={{ marginBottom: "1.25rem" }}>
        <div className="brand" style={{ color: "var(--yellow)", fontSize: "1.5rem" }}>
          {t("price")}
        </div>
        <p style={{ marginBottom: 0, color: "var(--muted)" }}>{statusText}</p>
      </div>

      <p style={{ fontWeight: 700, marginBottom: "0.75rem" }}>{t("payVia")}</p>
      <a
        className="btn btn-primary"
        href={env.paymentLink}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "inline-flex", marginBottom: "1.25rem", textDecoration: "none" }}
      >
        {t("payButton")}
      </a>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: 0 }}>
        {t("payHint")}
      </p>

      <details style={{ marginBottom: "1.25rem", color: "var(--muted)" }}>
        <summary style={{ cursor: "pointer" }}>{t("otherMethods")}</summary>
        <ul style={{ paddingLeft: "1.1rem" }}>
          <li>Orange Money : {env.paymentOrange}</li>
          <li>Wave : {env.paymentWave}</li>
          <li>Moov Money : {env.paymentMoov}</li>
        </ul>
      </details>

      {pending ? (
        <p className="badge">{t("pending")}</p>
      ) : (
        <>
          <p style={{ fontWeight: 700 }}>{t("afterPay")}</p>
          <BillingProofForm />
        </>
      )}
    </div>
  );
}
