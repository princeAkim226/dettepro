import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatFcfa } from "@/lib/money";
import { guardAccess } from "@/lib/guards";
import { listCustomerRows } from "@/lib/customers";
import { CustomerRow } from "@/components/CustomerList";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await guardAccess(locale);
  const t = await getTranslations("dashboard");

  const rows = await listCustomerRows(user.id);
  const totalDue = rows.reduce((s, r) => s + r.balance, 0);
  const priority = rows
    .filter((r) => r.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5);

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

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "0.5rem",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.1rem" }}>{t("priority")}</h2>
        <Link href="/customers/new" className="btn btn-primary" style={{ minHeight: "2.5rem" }}>
          {t("addCustomer")}
        </Link>
      </div>

      {rows.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>{t("empty")}</p>
      ) : (
        <div>
          {priority.length === 0 ? (
            <p style={{ color: "var(--ok)" }}>{t("allPaid")}</p>
          ) : (
            priority.map((row) => <CustomerRow key={row.id} row={row} />)
          )}
          <Link
            href="/customers"
            className="btn btn-ghost"
            style={{ width: "100%", marginTop: "1rem" }}
          >
            {t("seeAll")}
          </Link>
        </div>
      )}
    </div>
  );
}
