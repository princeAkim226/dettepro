"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { phoneToAuthEmail, normalizePhone } from "@/lib/phone";

async function finalizeProfile(payload: {
  phone: string;
  shopName: string;
  locale: string;
  name: string;
}) {
  await fetch("/api/profile/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function LoginForm() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          setError(null);
          const phone = normalizePhone(String(fd.get("phone") || ""));
          const password = String(fd.get("password") || "");
          const { error: err } = await authClient.signIn.email({
            email: phoneToAuthEmail(phone),
            password,
          });
          if (err) setError(t("submitLogin") + " — erreur");
          else router.push("/dashboard");
        });
      }}
    >
      <div className="field">
        <label htmlFor="phone">{t("phone")}</label>
        <input id="phone" name="phone" inputMode="tel" required placeholder="70 00 00 00" />
      </div>
      <div className="field">
        <label htmlFor="password">{t("password")}</label>
        <input id="password" name="password" type="password" required minLength={6} />
      </div>
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? tc("loading") : t("submitLogin")}
      </button>
      <p style={{ color: "var(--muted)", textAlign: "center" }}>
        {t("noAccount")}{" "}
        <Link href="/register" style={{ color: "var(--yellow)" }}>
          {t("submitRegister")}
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const t = useTranslations("auth");
  const tl = useTranslations("locales");
  const tc = useTranslations("common");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          setError(null);
          const name = String(fd.get("name") || "");
          const shopName = String(fd.get("shopName") || "");
          const phone = normalizePhone(String(fd.get("phone") || ""));
          const password = String(fd.get("password") || "");
          const locale = String(fd.get("locale") || "fr");

          const { error: err } = await authClient.signUp.email({
            email: phoneToAuthEmail(phone),
            password,
            name,
            // @ts-expect-error additional fields
            phone,
            shopName,
            locale,
          });
          if (err) {
            setError(err.message || "Inscription impossible");
            return;
          }

          await finalizeProfile({ phone, shopName, locale, name });
          router.push("/dashboard");
        });
      }}
    >
      <div className="field">
        <label htmlFor="name">{t("name")}</label>
        <input id="name" name="name" required minLength={2} />
      </div>
      <div className="field">
        <label htmlFor="shopName">{t("shopName")}</label>
        <input id="shopName" name="shopName" required minLength={2} />
      </div>
      <div className="field">
        <label htmlFor="phone">{t("phone")}</label>
        <input id="phone" name="phone" inputMode="tel" required placeholder="70 00 00 00" />
      </div>
      <div className="field">
        <label htmlFor="password">{t("password")}</label>
        <input id="password" name="password" type="password" required minLength={6} />
      </div>
      <div className="field">
        <label htmlFor="locale">{t("locale")}</label>
        <select id="locale" name="locale" defaultValue="fr">
          <option value="fr">{tl("fr")}</option>
          <option value="dyu">{tl("dyu")}</option>
          <option value="mos">{tl("mos")}</option>
        </select>
      </div>
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? tc("loading") : t("submitRegister")}
      </button>
      <p style={{ color: "var(--muted)", textAlign: "center" }}>
        {t("hasAccount")}{" "}
        <Link href="/login" style={{ color: "var(--yellow)" }}>
          {t("submitLogin")}
        </Link>
      </p>
    </form>
  );
}
