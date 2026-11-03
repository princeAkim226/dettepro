import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { guardAccess } from "@/lib/guards";
import { listCustomerRows } from "@/lib/customers";
import { CustomerList } from "@/components/CustomerList";

export default async function CustomersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await guardAccess(locale);
  const t = await getTranslations();
  const rows = await listCustomerRows(user.id);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.4rem" }}>{t("customers.title")}</h1>
        <Link href="/customers/new" className="btn btn-primary" style={{ minHeight: "2.5rem" }}>
          {t("dashboard.addCustomer")}
        </Link>
      </div>

      {rows.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>{t("dashboard.empty")}</p>
      ) : (
        <CustomerList rows={rows} />
      )}
    </div>
  );
}
