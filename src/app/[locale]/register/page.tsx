import { getTranslations, setRequestLocale } from "next-intl/server";
import { RegisterForm } from "@/components/AuthForms";
import { Link } from "@/i18n/navigation";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <main className="shell" style={{ paddingBottom: "2rem" }}>
      <Link href="/" className="brand" style={{ color: "var(--yellow)", fontSize: "1.4rem" }}>
        {t("brand")}
      </Link>
      <h1 style={{ margin: "1.5rem 0 1rem" }}>{t("auth.registerTitle")}</h1>
      <RegisterForm />
    </main>
  );
}
