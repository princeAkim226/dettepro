"use client";

import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";

export function BottomNav({ isAdmin }: { isAdmin?: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const items = [
    { href: "/dashboard", label: t("dashboard") },
    { href: "/customers/new", label: t("customers") },
    { href: "/reminders", label: t("reminders") },
    { href: isAdmin ? "/admin" : "/billing", label: isAdmin ? t("admin") : t("billing") },
  ] as const;

  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          data-active={pathname.startsWith(item.href) ? "true" : "false"}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function LogoutButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="btn btn-ghost"
      style={{ minHeight: "2.25rem", padding: "0.4rem 0.75rem", fontSize: "0.85rem" }}
      onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/fr"; } } })}
    >
      {label}
    </button>
  );
}
