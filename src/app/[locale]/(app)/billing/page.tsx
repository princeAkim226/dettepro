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
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { locale } = await params;
  const { paid } = await searchParams;
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

  const autoReady = Boolean(env.saspayWebhookSecret);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>{t("title")}</h1>
      <div className="stat" style={{ marginBottom: "1.25rem" }}>
        <div className="brand" style={{ color: "var(--yellow)", fontSize: "1.5rem" }}>
          {t("price")}
        </div>
        <p style={{ marginBottom: 0, color: "var(--muted)" }}>{statusText}</p>
      </div>

      {paid === "1" && access.ok && access.reason === "subscription" && (
        <p style={{ color: "var(--ok)", fontWeight: 600 }}>{t("autoOk")}</p>
      )}
      {paid === "1" && !(access.ok && access.reason === "subscription") && (
        <p style={{ color: "var(--yellow)" }}>{t("autoPending")}</p>
      )}

      {!(access.ok && access.reason === "subscription") && (
        <>
          <p style={{ fontWeight: 700, marginBottom: "0.75rem" }}>{t("payVia")}</p>
          <a
            className="btn btn-primary"
            href={env.paymentLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", marginBottom: "0.75rem", textDecoration: "none" }}
          >
            {t("payButton")}
          </a>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
            {autoReady ? t("autoHint", { phone: user.phone || "—" }) : t("payHint")}
          </p>
        </>
      )}

      {!autoReady && (
        <details style={{ marginTop: "1.25rem", marginBottom: "1.25rem" }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>{t("afterPay")}</summary>
          {pending ? (
            <p className="badge">{t("pending")}</p>
          ) : (
            <div style={{ marginTop: "0.75rem" }}>
              <BillingProofForm />
            </div>
          )}
        </details>
      )}

      {autoReady && pending && (
        <p className="badge" style={{ marginTop: "1rem" }}>
          {t("pending")}
        </p>
      )}
    </div>
  );
}
