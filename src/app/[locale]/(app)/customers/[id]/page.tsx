import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { customerBalance, formatFcfa } from "@/lib/money";
import { guardAccess } from "@/lib/guards";
import { RemindButton } from "@/components/Forms";

export default async function CustomerPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await guardAccess(locale);
  const t = await getTranslations("customer");
  const tc = await getTranslations("common");

  const customer = await prisma.customer.findFirst({
    where: { id, userId: user.id },
    include: {
      debts: { orderBy: { createdAt: "desc" } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!customer) notFound();

  const balance = customerBalance(customer.debts, customer.payments);
  const events = [
    ...customer.debts.map((d) => ({
      type: "debt" as const,
      amount: d.amount,
      label: d.reason || t("debt"),
      at: d.createdAt,
    })),
    ...customer.payments.map((p) => ({
      type: "payment" as const,
      amount: p.amount,
      label: p.note || t("payment"),
      at: p.createdAt,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <div>
      <Link href="/dashboard" style={{ color: "var(--muted)" }}>
        ← {tc("back")}
      </Link>
      <h1 style={{ margin: "1rem 0 0.25rem" }}>{customer.name}</h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>{customer.phone || "—"}</p>

      <div className="stat" style={{ marginBottom: "1rem" }}>
        <div style={{ color: "var(--muted)" }}>{t("balance")}</div>
        <div className="brand" style={{ fontSize: "1.8rem", color: "var(--yellow)" }}>
          {formatFcfa(balance)}
        </div>
      </div>

      <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <Link href={`/customers/${id}/debt`} className="btn btn-primary">
          {t("addDebt")}
        </Link>
        <Link href={`/customers/${id}/payment`} className="btn btn-ghost">
          {t("addPayment")}
        </Link>
        <RemindButton customerId={id} label={t("remind")} />
      </div>

      <h2 style={{ fontSize: "1.05rem" }}>{t("history")}</h2>
      {events.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>—</p>
      ) : (
        events.map((e, i) => (
          <div key={i} className="list-row">
            <div>
              <div style={{ fontWeight: 600 }}>{e.label}</div>
              <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                {e.at.toLocaleDateString("fr-FR")}
              </div>
            </div>
            <div
              style={{
                fontWeight: 700,
                color: e.type === "debt" ? "var(--yellow)" : "var(--ok)",
              }}
            >
              {e.type === "debt" ? "+" : "−"}
              {formatFcfa(e.amount)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
