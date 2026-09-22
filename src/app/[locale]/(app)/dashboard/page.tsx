import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { customerBalance, formatFcfa } from "@/lib/money";
import { guardAccess } from "@/lib/guards";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await guardAccess(locale);
  const t = await getTranslations("dashboard");

  const customers = await prisma.customer.findMany({
    where: { userId: user.id },
    include: { debts: true, payments: true },
    orderBy: { name: "asc" },
  });

  const rows = customers.map((c) => ({
    ...c,
    balance: customerBalance(c.debts, c.payments),
  }));
  const totalDue = rows.reduce((s, r) => s + r.balance, 0);

  return (
    <div>
      <div className="stat" style={{ marginBottom: "1.5rem" }}>
        <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{t("totalDue")}</div>
        <div
          className="brand"
          style={{ fontSize: "2rem", color: "var(--yellow)", marginTop: "0.35rem" }}
        >
          {formatFcfa(totalDue)}
        </div>
        <div style={{ color: "var(--muted)", marginTop: "0.35rem" }}>
          {rows.length} {t("customers")}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.1rem" }}>{t("customers")}</h2>
        <Link href="/customers/new" className="btn btn-primary" style={{ minHeight: "2.5rem" }}>
          {t("addCustomer")}
        </Link>
      </div>

      {rows.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>{t("empty")}</p>
      ) : (
        <div>
          {rows.map((c) => (
            <Link key={c.id} href={`/customers/${c.id}`} className="list-row">
              <div>
                <div style={{ fontWeight: 700 }}>{c.name}</div>
                <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                  {c.phone || "—"}
                </div>
              </div>
              <div style={{ textAlign: "right", fontWeight: 700, color: c.balance > 0 ? "var(--yellow)" : "var(--ok)" }}>
                {formatFcfa(c.balance)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
