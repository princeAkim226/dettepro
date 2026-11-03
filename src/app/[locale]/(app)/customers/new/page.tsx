import { setRequestLocale, getTranslations } from "next-intl/server";
import { CustomerForm } from "@/components/Forms";
import { Link } from "@/i18n/navigation";
import { guardAccess } from "@/lib/guards";

export default async function NewCustomerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await guardAccess(locale);
  const t = await getTranslations();

  return (
    <div>
      <Link href="/customers" style={{ color: "var(--muted)" }}>
        ← {t("common.back")}
      </Link>
      <h1 style={{ margin: "1rem 0" }}>{t("dashboard.addCustomer")}</h1>
      <CustomerForm />
    </div>
  );
}
