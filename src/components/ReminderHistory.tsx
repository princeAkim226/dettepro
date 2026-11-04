import { getTranslations } from "next-intl/server";

type ReminderLogRow = {
  id: string;
  channel: string;
  status: string;
  failureReason: string | null;
  providerMessageId: string | null;
  createdAt: Date;
  customer?: { name: string };
};

const STATUS_COLORS: Record<string, string> = {
  delivered: "var(--ok)",
  read: "var(--ok)",
  failed: "var(--danger)",
  sent: "var(--yellow)",
};

const FAILURE_REASONS = ["window", "undeliverable", "limited"];

export async function ReminderHistory({ logs }: { logs: ReminderLogRow[] }) {
  const t = await getTranslations("reminderLog");

  return (
    <section>
      <h2 style={{ fontSize: "1.05rem", marginBottom: "0.25rem" }}>{t("title")}</h2>
      {logs.length === 0 ? (
        <p style={{ color: "var(--muted)", margin: 0 }}>{t("empty")}</p>
      ) : (
        logs.map((log) => {
          // Sans identifiant Meta, on ne peut pas savoir si un ancien rappel est vraiment parti
          const statusKey =
            log.status === "sent" && !log.providerMessageId ? "unconfirmed" : log.status;
          const reason =
            log.failureReason && FAILURE_REASONS.includes(log.failureReason)
              ? log.failureReason
              : "other";

          return (
            <div key={log.id} className="list-row" style={{ alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                {log.customer && (
                  <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>
                    {log.customer.name}
                  </div>
                )}
                <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                  {log.channel === "voice" ? t("voice") : t("text")} ·{" "}
                  {log.createdAt.toLocaleString("fr-FR", {
                    timeZone: "Africa/Ouagadougou",
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </div>
                {log.status === "failed" && (
                  <div style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                    {t(`reason.${reason}`)}
                  </div>
                )}
              </div>
              <div
                style={{
                  flexShrink: 0,
                  maxWidth: "45%",
                  textAlign: "right",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: STATUS_COLORS[statusKey] ?? "var(--muted)",
                }}
              >
                {t(`status.${statusKey}`)}
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}
