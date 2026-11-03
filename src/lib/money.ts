/** Limite d'une colonne Int Postgres. */
export const MAX_AMOUNT = 2_147_483_647;

export function formatFcfa(amount: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`;
}

export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/\s/g, "").replace(/,/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n) || n > MAX_AMOUNT) return null;
  return n;
}

export function customerBalance(
  debts: { amount: number }[],
  payments: { amount: number }[],
): number {
  const totalDebt = debts.reduce((s, d) => s + d.amount, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  return Math.max(0, totalDebt - totalPaid);
}

/** Date de la plus ancienne dette non couverte : les paiements soldent d'abord les dettes les plus anciennes. */
export function oldestUnpaidDebtAt(
  debts: { amount: number; createdAt: Date }[],
  payments: { amount: number }[],
): Date | null {
  let paid = payments.reduce((s, p) => s + p.amount, 0);
  const sorted = [...debts].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  for (const debt of sorted) {
    if (paid < debt.amount) return debt.createdAt;
    paid -= debt.amount;
  }
  return null;
}
