/** Normalise un numéro BF (oMet les espaces, garde +226 optionnel). */
export function normalizePhone(input: string): string {
  let p = input.replace(/[\s.\-()]/g, "");
  if (p.startsWith("00226")) p = "+" + p.slice(2);
  if (p.startsWith("226") && p.length >= 11) p = "+" + p;
  if (/^\d{8}$/.test(p)) p = "+226" + p;
  return p;
}

export function phoneToAuthEmail(phone: string): string {
  const n = normalizePhone(phone).replace(/^\+/, "");
  return `${n}@users.dettepro.local`;
}

export function displayPhone(phone: string): string {
  const n = normalizePhone(phone);
  if (n.startsWith("+226") && n.length === 12) {
    return `${n.slice(4, 6)} ${n.slice(6, 8)} ${n.slice(8, 10)} ${n.slice(10)}`;
  }
  return n;
}
