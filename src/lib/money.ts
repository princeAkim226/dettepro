export function formatFcfa(amount: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`;
}

export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/\s/g, "").replace(/,/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null;
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
