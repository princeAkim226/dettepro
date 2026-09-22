import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatFcfa } from "@/lib/money";
import { AdminReviewButtons } from "@/components/Forms";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();
  const t = await getTranslations("admin");

  const proofs = await prisma.paymentProof.findMany({
    where: { status: "pending" },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>{t("title")}</h1>
      {proofs.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>{t("empty")}</p>
      ) : (
        proofs.map((p) => (
          <div
            key={p.id}
            style={{
              border: "1px solid var(--line)",
              borderRadius: "0.75rem",
              padding: "1rem",
              marginBottom: "0.75rem",
              background: "var(--surface)",
            }}
          >
            <div style={{ fontWeight: 700 }}>{p.user.shopName}</div>
            <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
              {p.user.phone} · {p.method} · {p.reference}
            </div>
            <div style={{ margin: "0.5rem 0" }}>{formatFcfa(2000)}</div>
            <AdminReviewButtons proofId={p.id} />
          </div>
        ))
      )}
    </div>
  );
}
