"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatFcfa } from "@/lib/money";
import type { CustomerRowData } from "@/lib/customers";

type SortKey = "amount" | "oldest" | "name";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function matches(row: CustomerRowData, query: string) {
  const text = normalizeText(query.trim());
  if (!text) return true;
  if (normalizeText(row.name).includes(text)) return true;
  const digits = query.replace(/\D/g, "");
  return digits.length > 0 && (row.phone ?? "").replace(/\D/g, "").includes(digits);
}

const SORTERS: Record<SortKey, (a: CustomerRowData, b: CustomerRowData) => number> = {
  amount: (a, b) => b.balance - a.balance || a.name.localeCompare(b.name, "fr"),
  oldest: (a, b) => (b.debtDays ?? -1) - (a.debtDays ?? -1) || a.name.localeCompare(b.name, "fr"),
  name: (a, b) => a.name.localeCompare(b.name, "fr"),
};

export function CustomerRow({ row }: { row: CustomerRowData }) {
  const t = useTranslations("customers");

  let status = t("upToDate");
  if (row.debtDays !== null) {
    status = row.debtDays === 0 ? t("today") : t("since", { days: row.debtDays });
  }

  return (
    <Link href={`/customers/${row.id}`} className="list-row">
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, overflowWrap: "anywhere" }}>{row.name}</div>
        <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{row.phone || "—"}</div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontWeight: 700, color: row.balance > 0 ? "var(--yellow)" : "var(--ok)" }}>
          {formatFcfa(row.balance)}
        </div>
        <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{status}</div>
      </div>
    </Link>
  );
}

export function CustomerList({ rows }: { rows: CustomerRowData[] }) {
  const t = useTranslations("customers");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("amount");

  const visible = useMemo(
    () => rows.filter((row) => matches(row, query)).sort(SORTERS[sort]),
    [rows, query, sort],
  );

  return (
    <div>
      <div className="field" style={{ marginBottom: "0.75rem" }}>
        <input
          type="search"
          aria-label={t("search")}
          placeholder={t("search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="field" style={{ marginBottom: "0.5rem" }}>
        <label htmlFor="sort">{t("sort")}</label>
        <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="amount">{t("sortAmount")}</option>
          <option value="oldest">{t("sortOldest")}</option>
          <option value="name">{t("sortName")}</option>
        </select>
      </div>

      {visible.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>{t("noResult")}</p>
      ) : (
        visible.map((row) => <CustomerRow key={row.id} row={row} />)
      )}
    </div>
  );
}
