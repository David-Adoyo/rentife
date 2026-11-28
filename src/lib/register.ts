/**
 * Rent register import: one set of rules shared by the browser (live highlighting) and the
 * server (final check before saving), so the two can never disagree.
 */
import { kePhone } from "./money";

export type Cell = string;
export type RegisterRow = {
  label: Cell; unit_code: Cell; type: Cell; rent: Cell; deposit: Cell; floor: Cell;
  tenant_name: Cell; phone: Cell; phone2: Cell; move_in: Cell; due_day: Cell; id_last4: Cell; language: Cell;
};
export type Field = keyof RegisterRow;
export const FIELDS: { key: Field; label: string; width: string }[] = [
  { key: "label", label: "Unit", width: "w-20" },
  { key: "unit_code", label: "M-Pesa code", width: "w-28" },
  { key: "type", label: "Type", width: "w-28" },
  { key: "rent", label: "Rent (KSh)", width: "w-24" },
  { key: "deposit", label: "Deposit (KSh)", width: "w-24" },
  { key: "floor", label: "Floor", width: "w-16" },
  { key: "tenant_name", label: "Tenant", width: "w-40" },
  { key: "phone", label: "Phone", width: "w-32" },
  { key: "phone2", label: "Second phone", width: "w-32" },
  { key: "move_in", label: "Move-in date", width: "w-28" },
  { key: "due_day", label: "Due day", width: "w-16" },
  { key: "id_last4", label: "ID (last 4)", width: "w-20" },
  { key: "language", label: "Language", width: "w-20" },
];
export const emptyRow = (): RegisterRow =>
  Object.fromEntries(FIELDS.map((f) => [f.key, ""])) as RegisterRow;

/* ── Header matching: the names landlords actually use ─────────────────────── */
const ALIASES: Record<Field, string[]> = {
  label: ["unit", "unit no", "unit number", "unit label", "house", "house no", "house number", "door", "door no", "room", "room no", "flat", "flat no"],
  unit_code: ["mpesa code", "m-pesa code", "account", "account no", "account number", "unit code", "code", "paybill account"],
  type: ["type", "unit type", "house type", "size"],
  rent: ["rent", "monthly rent", "rent ksh", "rent (ksh)", "rent amount", "amount", "kodi"],
  deposit: ["deposit", "deposit ksh", "deposit (ksh)", "security deposit"],
  floor: ["floor", "block", "level", "wing"],
  tenant_name: ["tenant", "tenant name", "name", "occupant", "full name", "mpangaji"],
  phone: ["phone", "phone no", "phone number", "mobile", "tenant phone", "tel", "contact", "simu"],
  phone2: ["second phone", "phone 2", "phone2", "alt phone", "alternative phone", "other phone"],
  move_in: ["move in", "move-in", "move in date", "move-in date", "start date", "date in", "entry date", "start"],
  due_day: ["due day", "rent due day", "due date", "pay day"],
  id_last4: ["id", "id no", "id number", "national id", "id last 4", "id (last 4)"],
  language: ["language", "lang", "lugha"],
};
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export function matchHeaders(headers: string[]): { map: (Field | null)[]; unknown: string[] } {
  const used = new Set<Field>();
  const map = headers.map((h) => {
    const n = norm(h);
    const hit = (Object.keys(ALIASES) as Field[]).find((f) => !used.has(f) && (ALIASES[f].map(norm).includes(n) || norm(f) === n));
    if (hit) used.add(hit);
    return hit ?? null;
  });
  return { map, unknown: headers.filter((h, i) => h.trim() && !map[i]) };
}

/* ── Normalisers ───────────────────────────────────────────────────────────── */
const TYPE_WORDS: [RegExp, string][] = [
  [/bed ?sit|single room|^sq$|servant/i, "bedsitter"], [/studio/i, "studio"],
  [/^(1|one)\s*(br|bed|bedroom)|1\s*b\/?r/i, "1br"], [/^(2|two)\s*(br|bed|bedroom)|2\s*b\/?r/i, "2br"],
  [/^(3|three)\s*(br|bed|bedroom)|3\s*b\/?r/i, "3br"], [/^([4-9]|four|five)\s*(br|bed|bedroom)|4\+/i, "4br+"],
  [/shop|kiosk|stall/i, "shop"], [/office/i, "office"],
];
export const normType = (s: string) => {
  const t = s.trim();
  if (!t) return "other";
  if (["bedsitter", "studio", "1br", "2br", "3br", "4br+", "shop", "office", "other"].includes(t.toLowerCase())) return t.toLowerCase();
  return TYPE_WORDS.find(([re]) => re.test(t))?.[1] ?? "other";
};
/** "KSh 15,000" / "15000" / "15,000.00" → 15000 shillings, or null. */
export const parseAmount = (s: string): number | null => {
  const t = s.replace(/ksh|kes|\/=|-$/gi, "").replace(/[,\s]/g, "");
  if (!t) return 0;
  return /^\d+(\.\d{1,2})?$/.test(t) ? Number(t) : null;
};
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
/** Kenyan dates: 1/11/2026, 01-11-26, 2026-11-01, 1 Nov 2026 → YYYY-MM-DD (day first, never US order). */
export const parseDate = (s: string): string | null => {
  const t = s.trim();
  if (!t) return "";
  let d: number, m: number, y: number;
  let x = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (x) [y, m, d] = [+x[1], +x[2], +x[3]];
  else if ((x = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/))) [d, m, y] = [+x[1], +x[2], +x[3]];
  else if ((x = t.match(/^(\d{1,2})\s*([a-z]{3})[a-z]*\.?,?\s*(\d{2,4})$/i)) && MONTHS.includes(x[2].toLowerCase())) [d, m, y] = [+x[1], MONTHS.indexOf(x[2].toLowerCase()) + 1, +x[3]];
  else return null;
  if (y < 100) y += 2000;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d || y < 1990 || y > 2100) return null;
  return dt.toISOString().slice(0, 10);
};

/* ── Validation ────────────────────────────────────────────────────────────── */
export type RowIssues = { errors: Partial<Record<Field, string>>; warnings: Partial<Record<Field, string>> };

export function checkRows(rows: RegisterRow[], prefix: string, existingCodes: Set<string> = new Set()): RowIssues[] {
  const code = (r: RegisterRow) => (r.unit_code.trim() || `${prefix}-${r.label}`).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const labelCount = new Map<string, number>(), codeCount = new Map<string, number>(), phoneCount = new Map<string, number>();
  for (const r of rows) {
    const l = r.label.trim().toUpperCase();
    if (l) labelCount.set(l, (labelCount.get(l) ?? 0) + 1);
    if (r.label.trim()) codeCount.set(code(r), (codeCount.get(code(r)) ?? 0) + 1);
    for (const p of [r.phone, r.phone2].map((x) => kePhone(x)).filter(Boolean) as string[]) phoneCount.set(p, (phoneCount.get(p) ?? 0) + 1);
  }
  return rows.map((r) => {
    const errors: RowIssues["errors"] = {}, warnings: RowIssues["warnings"] = {};
    const l = r.label.trim().toUpperCase();
    if (!l) errors.label = "Unit is required";
    else if (!/^[A-Z0-9-]{1,20}$/.test(l)) errors.label = "Letters, numbers and dashes only";
    else if ((labelCount.get(l) ?? 0) > 1) errors.label = "This unit appears twice";
    if (r.unit_code.trim() && !/^[A-Z0-9-]{2,24}$/i.test(r.unit_code.trim())) errors.unit_code = "Letters, numbers and dashes only";
    else if (l && !errors.label && (codeCount.get(code(r)) ?? 0) > 1) errors.unit_code = "Two units would share this code";
    else if (l && !errors.label && existingCodes.has(code(r))) errors.unit_code = "Already used by another unit";
    const rent = parseAmount(r.rent);
    if (rent === null) errors.rent = "Enter a number, e.g. 15000";
    else if (rent === 0 && r.tenant_name.trim()) warnings.rent = "No rent for an occupied unit?";
    if (parseAmount(r.deposit) === null) errors.deposit = "Enter a number, e.g. 15000";
    const hasTenant = !!r.tenant_name.trim();
    if (hasTenant && r.tenant_name.trim().length < 2) errors.tenant_name = "Full name, please";
    if (!hasTenant && (r.phone.trim() || r.move_in.trim())) errors.tenant_name = "Add the tenant’s name, or clear the phone/date";
    if (hasTenant && !r.phone.trim()) errors.phone = "Needed to match their M-Pesa payments";
    if (r.phone.trim() && !kePhone(r.phone)) errors.phone = "Not a Kenyan mobile number";
    if (r.phone2.trim() && !kePhone(r.phone2)) errors.phone2 = "Not a Kenyan mobile number";
    for (const k of ["phone", "phone2"] as const) {
      const p = kePhone(r[k]);
      if (p && (phoneCount.get(p) ?? 0) > 1 && !errors[k]) warnings[k] = "Same number on another row";
    }
    if (r.move_in.trim() && parseDate(r.move_in) === null) errors.move_in = "Use day/month/year, e.g. 01/11/2026";
    if (r.due_day.trim() && !(/^\d{1,2}$/.test(r.due_day.trim()) && +r.due_day >= 1 && +r.due_day <= 28)) errors.due_day = "A day from 1 to 28";
    const id = r.id_last4.replace(/\D/g, "");
    if (r.id_last4.trim() && id.length < 4) errors.id_last4 = "At least 4 digits";
    else if (id.length > 4) warnings.id_last4 = "Only the last 4 digits will be kept";
    if (r.language.trim() && !/^(en|english|sw|swahili|kiswahili)$/i.test(r.language.trim())) errors.language = "English or Kiswahili";
    return { errors, warnings };
  });
}

/** Clean rows → the shape public.import_register() takes (money in cents). Call only when checkRows has no errors. */
export function toPayload(rows: RegisterRow[]) {
  return rows.map((r) => ({
    label: r.label.trim().toUpperCase(),
    unit_code: r.unit_code.trim().toUpperCase() || undefined,
    type: normType(r.type),
    rent: Math.round((parseAmount(r.rent) ?? 0) * 100),
    deposit: Math.round((parseAmount(r.deposit) ?? 0) * 100),
    floor: r.floor.trim(),
    tenant_name: r.tenant_name.trim() || undefined,
    phones: [r.phone, r.phone2].map((p) => kePhone(p)).filter(Boolean),
    move_in: parseDate(r.move_in) || undefined,
    due_day: r.due_day.trim() ? Number(r.due_day) : undefined,
    id_last4: r.id_last4.replace(/\D/g, "").slice(-4) || undefined,
    language: /^(sw|swahili|kiswahili)$/i.test(r.language.trim()) ? "sw" : "en",
  }));
}

/** 2-D table (first row = headers) → register rows. */
export function rowsFromTable(table: string[][]): { rows: RegisterRow[]; unknown: string[] } {
  const [headers = [], ...body] = table;
  const { map, unknown } = matchHeaders(headers);
  const rows = body
    .filter((cells) => cells.some((c) => String(c ?? "").trim()))
    .map((cells) => {
      const r = emptyRow();
      map.forEach((f, i) => { if (f) r[f] = String(cells[i] ?? "").trim(); });
      return r;
    });
  return { rows, unknown };
}

/** Small RFC 4180 CSV parser (quoted fields, commas and newlines inside quotes). */
export function parseCsv(text: string): string[][] {
  const out: string[][] = []; let row: string[] = [], cell = "", q = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(cell); out.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); out.push(row); }
  return out;
}
