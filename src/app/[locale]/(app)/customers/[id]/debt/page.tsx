import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { guardAccess } from "@/lib/guards";
import { DebtForm } from "@/components/Forms";

export default async function DebtPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await guardAccess(locale);
  const t = await getTranslations("customer");
  const tc = await getTranslations("common");

  return (
    <div>
      <Link href={`/customers/${id}`} style={{ color: "var(--muted)" }}>
        ← {tc("back")}
      </Link>
      <h1 style={{ margin: "1rem 0" }}>{t("addDebt")}</h1>
      <DebtForm customerId={id} />
    </div>
  );
}
