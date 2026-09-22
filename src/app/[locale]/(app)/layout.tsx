import { getTranslations, setRequestLocale } from "next-intl/server";
import { BottomNav, LogoutButton, LocaleSwitcher } from "@/components/AppChrome";
import { requireUser } from "@/lib/session";
import { getAccessStatus } from "@/lib/subscription";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser();
  const access = await getAccessStatus(user.id);
  const t = await getTranslations();

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <div className="brand" style={{ color: "var(--yellow)", fontSize: "1.15rem" }}>
            {t("brand")}
          </div>
          <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{user.shopName}</div>
        </div>
        <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
          <LocaleSwitcher />
          <LogoutButton label={t("nav.logout")} />
        </div>
      </header>
      {!access.ok && user.role !== "ADMIN" && (
        <div
          style={{
            background: "rgba(255,92,92,0.15)",
            border: "1px solid var(--danger)",
            borderRadius: "0.75rem",
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            fontSize: "0.9rem",
          }}
        >
          {t("billing.expired")} —{" "}
          <a href={`/${locale}/billing`} style={{ color: "var(--yellow)" }}>
            {t("nav.billing")}
          </a>
        </div>
      )}
      {children}
      <BottomNav isAdmin={user.role === "ADMIN"} />
    </div>
  );
}
