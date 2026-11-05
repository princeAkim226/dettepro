"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { updateLocaleAction } from "@/app/actions";

export function BottomNav({ isAdmin }: { isAdmin?: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const items = [
    { href: "/dashboard", label: t("dashboard"), icon: "M3 11.5 12 4l9 7.5M5.5 10v10h13V10M10 20v-6h4v6" },
    {
      href: "/customers",
      label: t("customers"),
      icon: "M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 20v-1.5a4 4 0 0 0-3-3.9M15.5 4.2a3.5 3.5 0 0 1 0 6.6",
    },
    {
      href: "/reminders",
      label: t("reminders"),
      icon: "M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15zM10 21h4",
    },
    {
      href: isAdmin ? "/admin" : "/billing",
      label: isAdmin ? t("admin") : t("billing"),
      icon: "M3 6.5h18v11H3zM3 10.5h18M7 14.5h3",
    },
  ];

  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          data-active={pathname.startsWith(item.href) ? "true" : "false"}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d={item.icon} />
          </svg>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const tl = useTranslations("locales");

  return (
    <select
      aria-label="Langue"
      value={locale}
      className="btn btn-ghost"
      style={{
        minHeight: "2.25rem",
        padding: "0.35rem 0.5rem",
        fontSize: "0.85rem",
        width: "auto",
        maxWidth: "7.5rem",
      }}
      onChange={async (e) => {
        const next = e.target.value as "fr" | "dyu" | "mos";
        await updateLocaleAction(next);
        router.replace(pathname, { locale: next });
      }}
    >
      <option value="fr">{tl("fr")}</option>
      <option value="dyu">{tl("dyu")}</option>
      <option value="mos">{tl("mos")}</option>
    </select>
  );
}

export function LogoutButton({ label }: { label: string }) {
  const locale = useLocale();

  return (
    <button
      type="button"
      className="btn btn-ghost"
      style={{ minHeight: "2.25rem", padding: "0.4rem 0.75rem", fontSize: "0.85rem" }}
      onClick={() =>
        authClient.signOut({
          fetchOptions: {
            onSuccess: () => {
              window.location.href = `/${locale}`;
            },
          },
        })
      }
    >
      {label}
    </button>
  );
}
