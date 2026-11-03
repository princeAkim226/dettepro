import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { guardAccess } from "@/lib/guards";
import { displayPhone } from "@/lib/phone";
import { CustomerForm, DeleteCustomerButton } from "@/components/Forms";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await guardAccess(locale);
  const t = await getTranslations("customer");
  const tc = await getTranslations("common");

  const customer = await prisma.customer.findFirst({ where: { id, userId: user.id } });
  if (!customer) notFound();

  return (
    <div>
      <Link href={`/customers/${id}`} style={{ color: "var(--muted)" }}>
        ← {tc("back")}
      </Link>
      <h1 style={{ margin: "1rem 0" }}>{t("editCustomer")}</h1>
      <CustomerForm
        initial={{
          id,
          name: customer.name,
          phone: customer.phone ? displayPhone(customer.phone) : "",
          notes: customer.notes ?? "",
        }}
      />
      <DeleteCustomerButton customerId={id} name={customer.name} />
    </div>
  );
}
