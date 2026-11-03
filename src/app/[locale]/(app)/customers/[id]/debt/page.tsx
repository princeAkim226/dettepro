import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { customerBalance } from "@/lib/money";
import { guardAccess } from "@/lib/guards";
import { DebtForm } from "@/components/Forms";

export default async function DebtPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await guardAccess(locale);
  const t = await getTranslations("customer");
  const tc = await getTranslations("common");

  const customer = await prisma.customer.findFirst({
    where: { id, userId: user.id },
    include: { debts: true, payments: true },
  });
  if (!customer) notFound();

  return (
    <div>
      <Link href={`/customers/${id}`} style={{ color: "var(--muted)" }}>
        ← {tc("back")}
      </Link>
      <h1 style={{ margin: "1rem 0 0.25rem" }}>{t("addDebt")}</h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>{customer.name}</p>
      <DebtForm customerId={id} balance={customerBalance(customer.debts, customer.payments)} />
    </div>
  );
}
