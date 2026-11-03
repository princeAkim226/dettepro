import { differenceInCalendarDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { customerBalance, oldestUnpaidDebtAt } from "@/lib/money";
import { displayPhone } from "@/lib/phone";

export type CustomerRowData = {
  id: string;
  name: string;
  phone: string | null;
  balance: number;
  /** Ancienneté en jours de la plus vieille dette impayée, null si le client est à jour. */
  debtDays: number | null;
};

export async function listCustomerRows(userId: string): Promise<CustomerRowData[]> {
  const customers = await prisma.customer.findMany({
    where: { userId },
    include: { debts: true, payments: true },
  });
  const now = new Date();

  return customers.map((c) => {
    const balance = customerBalance(c.debts, c.payments);
    const oldest = balance > 0 ? oldestUnpaidDebtAt(c.debts, c.payments) : null;
    return {
      id: c.id,
      name: c.name,
      phone: c.phone ? displayPhone(c.phone) : null,
      balance,
      debtDays: oldest ? differenceInCalendarDays(now, oldest) : null,
    };
  });
}
