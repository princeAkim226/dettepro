import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getEnv } from "@/lib/env";
import { formatFcfa } from "@/lib/money";

const MOCK_CUSTOMERS = [
  { name: "Awa", amount: 12500, days: 21 },
  { name: "Issouf", amount: 7000, days: 9 },
  { name: "Mariam", amount: 3500, days: 2 },
];
const BENEFITS = ["who", "total", "whatsapp"] as const;
const STEPS = ["add", "note", "remind"] as const;
const INCLUDED = ["customers", "history", "whatsapp", "corrections"] as const;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const currentLocale = await getLocale();
  const ctaNote = t("landing.ctaNote", {
    days: getEnv().trialDays,
    price: t("billing.price"),
  });
  const mockTotal = MOCK_CUSTOMERS.reduce((sum, customer) => sum + customer.amount, 0);

  return (
    <div className="landing">
      <header className="landing-header">
        <span className="brand landing-logo">{t("brand")}</span>
        <div className="landing-header-actions">
          <nav aria-label={t("auth.locale")} className="landing-locales">
            {routing.locales.map((code) => (
              <Link
                key={code}
                href="/"
                locale={code}
                aria-current={code === currentLocale ? "true" : undefined}
              >
                {t(`locales.${code}`)}
              </Link>
            ))}
          </nav>
          <Link href="/login" className="btn btn-ghost landing-login">
            {t("ctaLogin")}
          </Link>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div>
            <p className="badge">{t("tagline")}</p>
            <h1 className="landing-title">{t("hero")}</h1>
            <p className="landing-lead">{t("heroSub")}</p>
            <Link href="/register" className="btn btn-primary landing-cta">
              {t("landing.cta")}
            </Link>
            <p className="landing-note">{ctaNote}</p>
          </div>

          <figure className="landing-mock" aria-label={t("landing.mockLabel")}>
            <figcaption className="landing-mock-label">{t("landing.mockExample")}</figcaption>
            <div className="stat">
              <div className="landing-muted">{t("dashboard.totalDue")}</div>
              <div className="brand landing-mock-total">{formatFcfa(mockTotal)}</div>
              <div className="landing-muted">
                {MOCK_CUSTOMERS.length} {t("dashboard.customers")}
              </div>
            </div>
            <div className="landing-mock-heading">{t("dashboard.priority")}</div>
            {MOCK_CUSTOMERS.map((customer) => (
              <div key={customer.name} className="list-row">
                <span className="landing-mock-name">{customer.name}</span>
                <span className="landing-mock-amount">
                  <strong>{formatFcfa(customer.amount)}</strong>
                  <small>{t("customers.since", { days: customer.days })}</small>
                </span>
              </div>
            ))}
          </figure>
        </section>

        <section className="landing-section">
          <h2>{t("landing.benefitsTitle")}</h2>
          <div className="landing-grid">
            {BENEFITS.map((key) => (
              <article key={key} className="landing-card">
                <h3>{t(`landing.benefits.${key}.title`)}</h3>
                <p>{t(`landing.benefits.${key}.text`)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section">
          <h2>{t("landing.stepsTitle")}</h2>
          <ol className="landing-steps">
            {STEPS.map((key, index) => (
              <li key={key}>
                <span className="landing-step-number" aria-hidden="true">
                  {index + 1}
                </span>
                <div>
                  <h3>{t(`landing.steps.${key}.title`)}</h3>
                  <p>{t(`landing.steps.${key}.text`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="landing-section landing-price">
          <div>
            <h2>{t("landing.priceTitle")}</h2>
            <p className="brand landing-price-amount">{t("billing.price")}</p>
            <p className="landing-muted">{t("landing.priceTrial", { days: getEnv().trialDays })}</p>
          </div>
          <div>
            <ul>
              {INCLUDED.map((key) => (
                <li key={key}>{t(`landing.included.${key}`)}</li>
              ))}
            </ul>
            <Link href="/register" className="btn btn-primary landing-cta">
              {t("landing.cta")}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
