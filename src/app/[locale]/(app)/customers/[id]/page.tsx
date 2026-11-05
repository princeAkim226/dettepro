import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { customerBalance, formatFcfa } from "@/lib/money";
import { displayPhone, whatsappLink } from "@/lib/phone";
import { buildReminderMessage } from "@/lib/reminders";
import { guardAccess } from "@/lib/guards";
import { RemindButton } from "@/components/Forms";
import { ReminderHistory } from "@/components/ReminderHistory";

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
      reminderLogs: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!customer) notFound();

  const settings = await prisma.reminderSettings.findUnique({ where: { userId: user.id } });

  const balance = customerBalance(customer.debts, customer.payments);
  const reminderMessage = buildReminderMessage({
    locale: user.locale,
    customerName: customer.name,
    amount: balance,
    shopName: user.shopName,
    template: settings?.messageTemplate,
  });
  const events = [
    ...customer.debts.map((d) => ({
      id: d.id,
      type: "debt" as const,
      amount: d.amount,
      label: d.reason || t("debt"),
      at: d.createdAt,
    })),
    ...customer.payments.map((p) => ({
      id: p.id,
      type: "payment" as const,
      amount: p.amount,
      label: p.note || t("payment"),
      at: p.createdAt,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/customers" style={{ color: "var(--muted)" }}>
          ← {tc("back")}
        </Link>
        <Link href={`/customers/${id}/edit`} style={{ color: "var(--yellow)", fontWeight: 600 }}>
          {t("edit")}
        </Link>
      </div>
      <h1 style={{ margin: "1rem 0 0.25rem", overflowWrap: "anywhere" }}>{customer.name}</h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        {customer.phone ? displayPhone(customer.phone) : "—"}
      </p>
      {customer.notes && (
        <p style={{ color: "var(--muted)", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {customer.notes}
        </p>
      )}

      <div className="stat" style={{ marginBottom: "1rem" }}>
        <div style={{ color: "var(--muted)" }}>{t("balance")}</div>
        <div className="brand" style={{ fontSize: "1.8rem", color: "var(--yellow)" }}>
          {formatFcfa(balance)}
        </div>
      </div>

      <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <div className="btn-row">
          <Link href={`/customers/${id}/debt`} className="btn btn-primary" style={{ textAlign: "center" }}>
            {t("addDebt")}
          </Link>
          <Link href={`/customers/${id}/payment`} className="btn btn-ghost" style={{ textAlign: "center" }}>
            {t("addPayment")}
          </Link>
        </div>

        {customer.phone ? (
          <>
            <div className="btn-row">
              <a href={`tel:${customer.phone}`} className="btn btn-ghost">
                {t("call")}
              </a>
              <a
                href={whatsappLink(customer.phone, balance > 0 ? reminderMessage : undefined)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
              >
                {t("whatsapp")}
              </a>
            </div>
            {balance > 0 && (
              <RemindButton customerId={id} name={customer.name} preview={reminderMessage} />
            )}
          </>
        ) : (
          <p style={{ color: "var(--muted)", margin: 0 }}>
            {t("noPhone")}{" "}
            <Link href={`/customers/${id}/edit`} style={{ color: "var(--yellow)" }}>
              {t("addPhone")}
            </Link>
          </p>
        )}
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <ReminderHistory logs={customer.reminderLogs} />
      </div>

      <h2 style={{ fontSize: "1.05rem", marginBottom: "0.25rem" }}>{t("history")}</h2>
      {events.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>—</p>
      ) : (
        <>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: 0 }}>{t("historyHint")}</p>
          {events.map((e) => (
            <Link key={e.id} href={`/customers/${id}/${e.type}/${e.id}`} className="list-row">
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{e.label}</div>
                <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                  {e.at.toLocaleDateString("fr-FR")}
                </div>
              </div>
              <div
                style={{
                  fontWeight: 700,
                  flexShrink: 0,
                  color: e.type === "debt" ? "var(--yellow)" : "var(--ok)",
                }}
              >
                {e.type === "debt" ? "+" : "−"}
                {formatFcfa(e.amount)}
              </div>
            </Link>
          ))}
        </>
      )}
    </div>
  );
}
