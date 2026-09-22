import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <main className="shell" style={{ paddingBottom: "2rem" }}>
      <div style={{ paddingTop: "2.5rem" }}>
        <p className="badge">{t("tagline")}</p>
        <h1
          className="brand"
          style={{
            fontSize: "clamp(2.4rem, 10vw, 3.4rem)",
            color: "var(--yellow)",
            lineHeight: 1.05,
            margin: "1rem 0 0.75rem",
          }}
        >
          {t("brand")}
        </h1>
        <p style={{ fontSize: "1.35rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
          {t("hero")}
        </p>
        <p style={{ color: "var(--muted)", marginBottom: "2rem", maxWidth: "28ch" }}>
          {t("heroSub")}
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            marginBottom: "2.5rem",
          }}
        >
          <Link href="/register" className="btn btn-primary">
            {t("ctaStart")}
          </Link>
          <Link href="/login" className="btn btn-ghost">
            {t("ctaLogin")}
          </Link>
        </div>

        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gap: "0.75rem",
            color: "var(--muted)",
          }}
        >
          <li>✓ Cahier propre — qui te doit quoi</li>
          <li>✓ Total automatique</li>
          <li>✓ Rappels WhatsApp texte + vocal</li>
        </ul>
      </div>
    </main>
  );
}
