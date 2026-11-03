"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { formatFcfa, MAX_AMOUNT } from "@/lib/money";
import {
  createCustomerAction,
  updateCustomerAction,
  deleteCustomerAction,
  addDebtAction,
  updateDebtAction,
  deleteDebtAction,
  addPaymentAction,
  updatePaymentAction,
  deletePaymentAction,
  remindNowAction,
  saveReminderSettingsAction,
  submitPaymentProofAction,
  reviewPaymentProofAction,
} from "@/app/actions";

const QUICK_AMOUNTS = [500, 1000, 5000, 10000];
const amountFormat = new Intl.NumberFormat("fr-FR");

function AmountField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor="amount">{label}</label>
      <input
        id="amount"
        name="amount"
        inputMode="numeric"
        autoComplete="off"
        required
        placeholder="0"
        value={value ? amountFormat.format(value) : ""}
        onChange={(e) => {
          const next = Number(e.target.value.replace(/\D/g, ""));
          if (next <= MAX_AMOUNT) onChange(next);
        }}
      />
      <div className="chips">
        {QUICK_AMOUNTS.map((amount) => (
          <button
            key={amount}
            type="button"
            className="chip"
            onClick={() => onChange(Math.min(value + amount, MAX_AMOUNT))}
          >
            +{amountFormat.format(amount)}
          </button>
        ))}
        {children}
      </div>
    </div>
  );
}

function ConfirmPanel({
  message,
  preview,
  confirmLabel,
  danger,
  pending,
  onConfirm,
  onCancel,
}: {
  message: string;
  preview?: string;
  confirmLabel: string;
  danger?: boolean;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const tc = useTranslations("common");

  return (
    <div className="confirm-panel" role="alertdialog" aria-label={message}>
      <p style={{ margin: 0 }}>{message}</p>
      {preview && <blockquote className="message-preview">{preview}</blockquote>}
      <div className="btn-row">
        <button type="button" className="btn btn-ghost" disabled={pending} onClick={onCancel}>
          {tc("cancel")}
        </button>
        <button
          type="button"
          className={danger ? "btn btn-danger" : "btn btn-primary"}
          disabled={pending}
          onClick={onConfirm}
        >
          {pending ? tc("loading") : confirmLabel}
        </button>
      </div>
    </div>
  );
}

export function CustomerForm({
  initial,
}: {
  initial?: { id: string; name: string; phone: string; notes: string };
}) {
  const t = useTranslations("customer");
  const tc = useTranslations("common");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      action={(fd) => {
        if (initial) fd.set("customerId", initial.id);
        start(async () => {
          setError(null);
          const res = initial ? await updateCustomerAction(fd) : await createCustomerAction(fd);
          if (res.error) setError(res.error);
          else if (res.id) router.replace(`/customers/${res.id}`);
        });
      }}
    >
      <div className="field">
        <label htmlFor="name">{t("name")}</label>
        <input id="name" name="name" required minLength={2} defaultValue={initial?.name} />
      </div>
      <div className="field">
        <label htmlFor="phone">{t("phone")}</label>
        <input
          id="phone"
          name="phone"
          inputMode="tel"
          placeholder="70 00 00 00"
          defaultValue={initial?.phone}
        />
      </div>
      <div className="field">
        <label htmlFor="notes">{t("notes")}</label>
        <textarea id="notes" name="notes" defaultValue={initial?.notes} />
      </div>
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      <button className="btn btn-primary" disabled={pending}>
        {pending ? tc("loading") : t("save")}
      </button>
    </form>
  );
}

export function DebtForm({
  customerId,
  balance,
  initial,
}: {
  customerId: string;
  balance: number;
  initial?: { id: string; amount: number; reason: string };
}) {
  const t = useTranslations("customer");
  const tc = useTranslations("common");
  const router = useRouter();
  const [amount, setAmount] = useState(initial?.amount ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const balanceWithoutEntry = balance - (initial?.amount ?? 0);

  return (
    <form
      className="flex flex-col gap-4"
      action={(fd) => {
        fd.set("customerId", customerId);
        if (initial) fd.set("entryId", initial.id);
        start(async () => {
          setError(null);
          const res = initial ? await updateDebtAction(fd) : await addDebtAction(fd);
          if (res.error) setError(res.error);
          else router.replace(`/customers/${customerId}`);
        });
      }}
    >
      <AmountField label={t("amount")} value={amount} onChange={setAmount} />
      <p className="balance-after">
        {t("balanceAfter", { amount: formatFcfa(Math.max(0, balanceWithoutEntry + amount)) })}
      </p>
      <div className="field">
        <label htmlFor="reason">{t("reason")}</label>
        <input id="reason" name="reason" placeholder="Sac de riz" defaultValue={initial?.reason} />
      </div>
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      <button className="btn btn-primary" disabled={pending}>
        {pending ? tc("loading") : t("save")}
      </button>
    </form>
  );
}

export function PaymentForm({
  customerId,
  balance,
  initial,
}: {
  customerId: string;
  balance: number;
  initial?: { id: string; amount: number; note: string };
}) {
  const t = useTranslations("customer");
  const tc = useTranslations("common");
  const router = useRouter();
  const [amount, setAmount] = useState(initial?.amount ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const due = balance + (initial?.amount ?? 0);
  const overpaid = amount > due;

  return (
    <form
      className="flex flex-col gap-4"
      action={(fd) => {
        fd.set("customerId", customerId);
        if (initial) fd.set("entryId", initial.id);
        start(async () => {
          setError(null);
          const res = initial ? await updatePaymentAction(fd) : await addPaymentAction(fd);
          if (res.error) setError(res.error);
          else router.replace(`/customers/${customerId}`);
        });
      }}
    >
      <p className="balance-after" style={{ fontWeight: 700 }}>
        {due > 0 ? t("due", { amount: formatFcfa(due) }) : t("nothingDue")}
      </p>
      <AmountField label={t("amount")} value={amount} onChange={setAmount}>
        {due > 0 && (
          <button type="button" className="chip chip-strong" onClick={() => setAmount(due)}>
            {t("payAll")}
          </button>
        )}
      </AmountField>
      {overpaid ? (
        <p style={{ color: "var(--danger)", margin: 0 }}>{t("overpay")}</p>
      ) : (
        <p className="balance-after">
          {t("balanceAfter", { amount: formatFcfa(due - amount) })}
        </p>
      )}
      <div className="field">
        <label htmlFor="note">{t("note")}</label>
        <input id="note" name="note" defaultValue={initial?.note} />
      </div>
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      <button className="btn btn-primary" disabled={pending || overpaid || due === 0}>
        {pending ? tc("loading") : t("save")}
      </button>
    </form>
  );
}

function DeleteButton({
  message,
  run,
  onDone,
}: {
  message: string;
  run: () => Promise<{ error?: string }>;
  onDone: () => void;
}) {
  const t = useTranslations("customer");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div style={{ marginTop: "1.5rem" }}>
      {open ? (
        <ConfirmPanel
          message={message}
          confirmLabel={t("deleteConfirm")}
          danger
          pending={pending}
          onCancel={() => setOpen(false)}
          onConfirm={() =>
            start(async () => {
              setError(null);
              const res = await run();
              if (res.error) {
                setError(res.error);
                setOpen(false);
              } else {
                onDone();
              }
            })
          }
        />
      ) : (
        <button
          type="button"
          className="btn btn-ghost btn-ghost-danger"
          style={{ width: "100%" }}
          onClick={() => setOpen(true)}
        >
          {t("delete")}
        </button>
      )}
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
    </div>
  );
}

export function DeleteCustomerButton({ customerId, name }: { customerId: string; name: string }) {
  const t = useTranslations("customer");
  const router = useRouter();

  return (
    <DeleteButton
      message={t("deleteCustomerMessage", { name })}
      run={() => deleteCustomerAction(customerId)}
      onDone={() => router.replace("/customers")}
    />
  );
}

export function DeleteEntryButton({
  kind,
  entryId,
  customerId,
}: {
  kind: "debt" | "payment";
  entryId: string;
  customerId: string;
}) {
  const t = useTranslations("customer");
  const router = useRouter();

  return (
    <DeleteButton
      message={t("deleteEntryMessage")}
      run={() => (kind === "debt" ? deleteDebtAction(entryId) : deletePaymentAction(entryId))}
      onDone={() => router.replace(`/customers/${customerId}`)}
    />
  );
}

export function RemindButton({
  customerId,
  name,
  preview,
}: {
  customerId: string;
  name: string;
  preview: string;
}) {
  const t = useTranslations("customer");
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{ text: string; color: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <div>
      {open ? (
        <ConfirmPanel
          message={t("remindPreview", { name })}
          preview={preview}
          confirmLabel={t("remindSend")}
          pending={pending}
          onCancel={() => setOpen(false)}
          onConfirm={() =>
            start(async () => {
              const res = await remindNowAction(customerId);
              if (res.error) setResult({ text: res.error, color: "var(--danger)" });
              else if (res.dryRun) setResult({ text: t("remindDisabled"), color: "var(--yellow)" });
              else setResult({ text: t("remindSent"), color: "var(--ok)" });
              setOpen(false);
            })
          }
        />
      ) : (
        <button
          type="button"
          className="btn btn-ghost"
          style={{ width: "100%" }}
          onClick={() => {
            setResult(null);
            setOpen(true);
          }}
        >
          {t("remind")}
        </button>
      )}
      {result && (
        <p role="status" style={{ color: result.color, fontSize: "0.85rem" }}>
          {result.text}
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
