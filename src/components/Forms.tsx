"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  createCustomerAction,
  addDebtAction,
  addPaymentAction,
  remindNowAction,
  saveReminderSettingsAction,
  submitPaymentProofAction,
  reviewPaymentProofAction,
} from "@/app/actions";

export function NewCustomerForm() {
  const t = useTranslations("customer");
  const tc = useTranslations("common");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      action={(fd) => {
        start(async () => {
          const res = await createCustomerAction(fd);
          if (res.error) setError(res.error);
          else if (res.id) router.push(`/customers/${res.id}`);
        });
      }}
    >
      <div className="field">
        <label htmlFor="name">Nom</label>
        <input id="name" name="name" required minLength={2} />
      </div>
      <div className="field">
        <label htmlFor="phone">{t("phone")}</label>
        <input id="phone" name="phone" inputMode="tel" placeholder="70 00 00 00" />
      </div>
      <div className="field">
        <label htmlFor="notes">{t("notes")}</label>
        <textarea id="notes" name="notes" />
      </div>
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      <button className="btn btn-primary" disabled={pending}>
        {pending ? tc("loading") : t("save")}
      </button>
    </form>
  );
}

export function DebtForm({ customerId }: { customerId: string }) {
  const t = useTranslations("customer");
  const tc = useTranslations("common");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      action={(fd) => {
        fd.set("customerId", customerId);
        start(async () => {
          const res = await addDebtAction(fd);
          if (res.error) setError(res.error);
          else router.push(`/customers/${customerId}`);
        });
      }}
    >
      <div className="field">
        <label htmlFor="amount">{t("amount")}</label>
        <input id="amount" name="amount" inputMode="numeric" required placeholder="5000" />
      </div>
      <div className="field">
        <label htmlFor="reason">{t("reason")}</label>
        <input id="reason" name="reason" placeholder="Sac de riz" />
      </div>
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      <button className="btn btn-primary" disabled={pending}>
        {pending ? tc("loading") : t("save")}
      </button>
    </form>
  );
}

export function PaymentForm({ customerId }: { customerId: string }) {
  const t = useTranslations("customer");
  const tc = useTranslations("common");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      action={(fd) => {
        fd.set("customerId", customerId);
        start(async () => {
          const res = await addPaymentAction(fd);
          if (res.error) setError(res.error);
          else router.push(`/customers/${customerId}`);
        });
      }}
    >
      <div className="field">
        <label htmlFor="amount">{t("amount")}</label>
        <input id="amount" name="amount" inputMode="numeric" required />
      </div>
      <div className="field">
        <label htmlFor="note">{t("note")}</label>
        <input id="note" name="note" />
      </div>
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      <button className="btn btn-primary" disabled={pending}>
        {pending ? tc("loading") : t("save")}
      </button>
    </form>
  );
}

export function RemindButton({ customerId, label }: { customerId: string; label: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div>
      <button
        type="button"
        className="btn btn-ghost"
        style={{ width: "100%" }}
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMsg(null);
            const res = await remindNowAction(customerId);
            if (res.error) setMsg(res.error);
            else if (res.dryRun) setMsg("Simulation uniquement (dry-run) — pas d'envoi réel");
            else setMsg("Envoyé (texte + vocal si dispo). Regarde WhatsApp (+1 555-…).");
          })
        }
      >
        {label}
      </button>
      {msg && (
        <p style={{ color: msg === "OK" ? "var(--ok)" : "var(--danger)", fontSize: "0.85rem" }}>
          {msg}
        </p>
      )}
    </div>
  );
}

export function ReminderSettingsForm({
  initial,
}: {
  initial: {
    enabled: boolean;
    channel: string;
    frequencyType: string;
    everyNDays: number | null;
    weeklyDay: number;
    hour: number;
    minute: number;
    messageTemplate: string | null;
  };
}) {
  const t = useTranslations("reminders");
  const tc = useTranslations("common");
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      action={(fd) => {
        start(async () => {
          await saveReminderSettingsAction(fd);
          setOk(true);
        });
      }}
    >
      <label style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <input type="checkbox" name="enabled" defaultChecked={initial.enabled} />
        {t("enabled")}
      </label>

      <div className="field">
        <label htmlFor="channel">{t("channel")}</label>
        <select id="channel" name="channel" defaultValue={initial.channel}>
          <option value="text">{t("text")}</option>
          <option value="voice">{t("voice")}</option>
          <option value="both">{t("both")}</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="frequencyType">{t("frequency")}</label>
        <select id="frequencyType" name="frequencyType" defaultValue={initial.frequencyType}>
          <option value="daily">{t("daily")}</option>
          <option value="weekly">{t("weekly")}</option>
          <option value="every_n_days">{t("everyN")}</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="weeklyDay">{t("day")} (0=dim … 5=ven)</label>
        <input
          id="weeklyDay"
          name="weeklyDay"
          type="number"
          min={0}
          max={6}
          defaultValue={initial.weeklyDay}
        />
      </div>

      <div className="field">
        <label htmlFor="everyNDays">N jours</label>
        <input
          id="everyNDays"
          name="everyNDays"
          type="number"
          min={1}
          max={30}
          defaultValue={initial.everyNDays ?? 3}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div className="field">
          <label htmlFor="hour">{t("hour")}</label>
          <input id="hour" name="hour" type="number" min={0} max={23} defaultValue={initial.hour} />
        </div>
        <div className="field">
          <label htmlFor="minute">Min</label>
          <input
            id="minute"
            name="minute"
            type="number"
            min={0}
            max={59}
            defaultValue={initial.minute}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="messageTemplate">{t("template")}</label>
        <textarea
          id="messageTemplate"
          name="messageTemplate"
          defaultValue={initial.messageTemplate ?? ""}
          placeholder="{name} {amount} {shop}"
        />
      </div>

      <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{t("hint")}</p>
      {ok && <p style={{ color: "var(--ok)" }}>OK</p>}
      <button className="btn btn-primary" disabled={pending}>
        {pending ? tc("loading") : t("save")}
      </button>
    </form>
  );
}

export function BillingProofForm() {
  const t = useTranslations("billing");
  const tc = useTranslations("common");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      action={(fd) => {
        start(async () => {
          setError(null);
          const res = await submitPaymentProofAction(fd);
          if (res.error) setError(res.error);
          else setOk(true);
        });
      }}
    >
      <div className="field">
        <label htmlFor="method">{t("method")}</label>
        <select id="method" name="method" required defaultValue="SASPAY">
          <option value="SASPAY">SasPay</option>
          <option value="ORANGE_MONEY">Orange Money</option>
          <option value="WAVE">Wave</option>
          <option value="MOOV">Moov Money</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="reference">{t("reference")}</label>
        <input id="reference" name="reference" required />
      </div>
      <div className="field">
        <label htmlFor="note">Note</label>
        <input id="note" name="note" />
      </div>
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      {ok && <p style={{ color: "var(--ok)" }}>{t("pending")}</p>}
      <button className="btn btn-primary" disabled={pending || ok}>
        {pending ? tc("loading") : t("submit")}
      </button>
    </form>
  );
}

export function AdminReviewButtons({ proofId }: { proofId: string }) {
  const t = useTranslations("admin");
  const [pending, start] = useTransition();

  return (
    <div style={{ display: "flex", gap: "0.5rem" }}>
      <button
        type="button"
        className="btn btn-primary"
        style={{ minHeight: "2.5rem" }}
        disabled={pending}
        onClick={() =>
          start(async () => {
            await reviewPaymentProofAction(proofId, "approve");
          })
        }
      >
        {t("approve")}
      </button>
      <button
        type="button"
        className="btn btn-danger"
        style={{ minHeight: "2.5rem" }}
        disabled={pending}
        onClick={() =>
          start(async () => {
            await reviewPaymentProofAction(proofId, "reject");
          })
        }
      >
        {t("reject")}
      </button>
    </div>
  );
}
